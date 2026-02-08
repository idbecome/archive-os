import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';
import fs from 'fs';
import { createWorker } from 'tesseract.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import db from './db.js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

import { pathToFileURL } from 'url';

// Configure PDF.js worker
const workerPath = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'legacy', 'build', 'pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

// Redis Connection
const connection = new IORedis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null,
    retryStrategy(times) {
        if (times % 5 === 0) {
            console.warn(`[Redis/Worker] Retrying connection (attempt ${times})...`);
        }
        return Math.min(times * 500, 15000);
    }
});

let lastWorkerError = '';
connection.on('error', (err) => {
    if (err.message !== lastWorkerError) {
        console.error('[Redis/Worker] Connection Issue:', err.message);
        lastWorkerError = err.message;
    }
});

connection.on('connect', () => {
    console.log('[Redis/Worker] Connected successfully.');
    lastWorkerError = '';
});

// Helper: Convert Raw PDF Image Data to PPM (Tesseract Compatible)
function mkPPM(imgObj) {
    const { width, height, data } = imgObj;
    if (!width || !height || !data) return null;

    // Determine channels
    const size = width * height;
    const len = data.length;
    let channels = len / size;

    // PDF.js often returns padded rows or specific formats, but for many scanned PDFs 
    // it's often clean RGB (3) or RGBA (4) or Gray (1).
    // Tesseract supports PPM (RGB) and PGM (Gray).

    let header = "";
    let body = Buffer.from(data);

    if (channels === 1) {
        // PGM (Gray)
        header = `P5\n${width} ${height}\n255\n`;
    } else if (channels === 3) {
        // PPM (RGB)
        header = `P6\n${width} ${height}\n255\n`;
    } else if (channels === 4) {
        // RGBA -> Convert to RGB (PPM) by dropping alpha
        // This is expensive in JS but necessary without Canvas
        header = `P6\n${width} ${height}\n255\n`;
        const newData = Buffer.alloc(width * height * 3);
        for (let i = 0; i < size; i++) {
            newData[i * 3] = data[i * 4];     // R
            newData[i * 3 + 1] = data[i * 4 + 1]; // G
            newData[i * 3 + 2] = data[i * 4 + 2]; // B
        }
        body = newData;
    } else {
        console.warn(`[OCR-PDF] Unsupported channel count: ${channels} (Length: ${len}, Size: ${size})`);
        return null; // Try to let Tesseract handle it? No, it failed.
    }

    return Buffer.concat([Buffer.from(header, 'ascii'), body]);
}

// Helper: Extract Images from PDF (for Scanned PDFs)
async function extractImagesFromPDF(pdfBuffer, maxPages = Infinity, job = null) {
    const images = [];
    try {
        const uint8Array = new Uint8Array(pdfBuffer);
        const loadingTask = pdfjsLib.getDocument(uint8Array);
        const pdfDocument = await loadingTask.promise;

        const numPagesToProcess = maxPages === Infinity ? pdfDocument.numPages : Math.min(pdfDocument.numPages, maxPages);
        console.log(`[OCR-PDF] Found ${pdfDocument.numPages} pages. Processing ALL ${numPagesToProcess} pages (Full Scan).`);

        for (let i = 1; i <= numPagesToProcess; i++) {
            if (job) {
                const percentage = Math.round((i / numPagesToProcess) * 100);
                await job.updateProgress(percentage);
            }

            try {
                const page = await pdfDocument.getPage(i);
                const ops = await page.getOperatorList();

                for (let j = 0; j < ops.fnArray.length; j++) {
                    const op = ops.fnArray[j];
                    if (op === pdfjsLib.OPS.paintImageXObject) {
                        const imgName = ops.argsArray[j][0];
                        try {
                            const imgObj = await page.objs.get(imgName);

                            // Lower threshold to 50x50 to catch low-res scans
                            if (imgObj && imgObj.data && imgObj.width > 50 && imgObj.height > 50) {
                                const start = Date.now();
                                const ppmBuffer = mkPPM(imgObj);
                                if (ppmBuffer) {
                                    images.push(ppmBuffer);
                                    console.log(`[OCR-PDF] Extracted image ${imgName} (${imgObj.width}x${imgObj.height}) in ${Date.now() - start}ms`);
                                }
                            } else {
                                console.log(`[OCR-PDF] Skipped small image: ${imgName} (${imgObj?.width}x${imgObj?.height})`);
                            }
                        } catch (e) { console.warn(`[OCR-PDF] Image extract error on page ${i}, image ${imgName}:`, e); }
                    }
                }
            } catch (pageErr) {
                console.warn(`[OCR-PDF] Page ${i} extraction failed (skipping):`, pageErr);
            }
        }
    } catch (e) {
        console.error("PDF Image Extraction Failed (Fatal):", e);
    }
    console.log(`[OCR-PDF] Total images optimized for OCR: ${images.length}`);
    return images;
}

// Worker Processor
const worker = new Worker('OCR_QUEUE', async (job) => {
    const { docId, filePath, fileType, originalName, context } = job.data;
    const isInventory = context && context.type === 'inventory';

    console.log(`[Worker] Processing Job ${job.id} for ${isInventory ? 'Inventory Invoice' : 'Document'}: ${docId}`);

    try {
        // 1. Validate File
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        // 2. OCR Hybrid logic (Internal Text extraction + Tesseract fallback)
        let extractedText = "";

        if (fileType.startsWith('image/')) {
            const tess = await createWorker('eng+ind');
            const { data: { text } } = await tess.recognize(filePath);
            await tess.terminate();
            extractedText = `[OCR IMAGE]\n${text}`;
        }
        else if (fileType === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath);

            const PDFParser = typeof pdf === 'function'
                ? pdf
                : (pdf.PDFParse || (pdf.default && (pdf.default.PDFParse || (typeof pdf.default === 'function' ? pdf.default : null))) || pdf.default);

            if (!PDFParser) {
                console.error("[Worker] PDF Library Error: Could not find parser in", pdf);
                throw new Error("PDF parsing library not initialized correctly.");
            }

            try {
                // Determine if PDFParser is a class or function
                let data;

                // Case 1: It's a Class (has prototype.constructor) or we previously caught a 'Class constructor' error
                // We try to instantiate it.
                if (PDFParser.prototype && PDFParser.prototype.constructor) {
                    try {
                        // usage: new PDFParser(dataBuffer)
                        const instance = new PDFParser(dataBuffer);
                        // If instance is a promise (rare but possible in some libs), await it
                        if (typeof instance.then === 'function') {
                            data = await instance;
                        } else if (typeof instance.text === 'string') {
                            // Sync return?
                            data = instance;
                        } else {
                            // Maybe it has a parse method? But pdf-parse usually returns a Promise when called as function.
                            // If it's a class, let's assume it returns the data object directly or via promise.
                            data = instance;
                        }
                    } catch (e) {
                        // If 'new' fails, maybe it wasn't a class after all, or construction failed.
                        // But if it failed with "not a constructor", we should have caught it.
                        // If it failed with "Class constructor cannot be invoked without 'new'", we are doing 'new' here.
                        console.warn("[Worker] Class instantiation failed, trying function call:", e.message);
                        data = await PDFParser(dataBuffer);
                    }
                } else {
                    // Case 2: It's a Function
                    data = await PDFParser(dataBuffer);
                }

                extractedText = (data && data.text ? data.text : '').trim();

                // Detect Scanned PDF or Failed Text Extraction
                if (extractedText.length < 50) {
                    console.log('[Worker] Detected Low Text Content (<50 chars). Checking for Images or Complex Text...');

                    try {
                        // 1. Try Image Extraction (for Scans)
                        const images = await extractImagesFromPDF(dataBuffer, Infinity, job);

                        if (images.length > 0) {
                            console.log(`[Worker] Found ${images.length} images. OCR-ing images...`);
                            extractedText += "\n\n[OCR SCANNED PDF RESULT]:\n";
                            const tess = await createWorker('eng+ind');
                            for (const imgBuffer of images) {
                                const { data: { text } } = await tess.recognize(imgBuffer);
                                extractedText += text + "\n";
                            }
                            await tess.terminate();

                        } else {
                            // 2. No Images found? Try PDF.js Text Extraction (Fallback for "Save as PDF" / Tables)
                            console.log('[Worker] No images found. Attempting PDF.js Text Extraction...');
                            try {
                                const uint8Array = new Uint8Array(dataBuffer);
                                const loadingTask = pdfjsLib.getDocument(uint8Array);
                                const pdfDocument = await loadingTask.promise;
                                let pdfJsText = "";

                                for (let i = 1; i <= pdfDocument.numPages; i++) {
                                    const page = await pdfDocument.getPage(i);
                                    const tokenizedText = await page.getTextContent();
                                    const pageText = tokenizedText.items.map(token => token.str).join(' ');
                                    pdfJsText += pageText + "\n";
                                }

                                if (pdfJsText.trim().length > 10) {
                                    extractedText = `[PDF-JS]\n${pdfJsText}`; // Use PDF.js text if better
                                    console.log('[Worker] PDF.js extraction success.');
                                } else if (extractedText.trim().length > 0) {
                                    // 3. If both failed but we have SOME text from pdf-parse, keep it.
                                    extractedText += "\n\n[INFO] Teks diekstrak terbatas.";
                                } else {
                                    // 4. Truly Empty
                                    extractedText += "\n\n[INFO] Dokumen tampak kosong atau terproteksi. Tidak ada teks atau gambar yang dapat diekstrak.";
                                }
                            } catch (pdfJsErr) {
                                console.error("[Worker] PDF.js Text Extraction Failed:", pdfJsErr);
                                extractedText += "\n\n[ERROR] Gagal mengekstrak teks sekunder.";
                            }
                        }
                    } catch (imgErr) {
                        console.error("[Worker] Scanned PDF Fallback Failed:", imgErr);
                        extractedText += "\n\n[ERROR] Gagal memproses scan.";
                    }
                }

                extractedText = `[PDF]\n${extractedText}`;

            } catch (pdfErr) {
                // If the initial attempt failed
                if (pdfErr.message.includes("Class constructors cannot be invoked without 'new'")) {
                    // Retry with 'new' if we haven't already
                    try {
                        const data = await new PDFParser(dataBuffer);
                        extractedText = (data && data.text ? data.text : '').trim();
                        extractedText = `[PDF]\n${extractedText}`;
                    } catch (retryErr) {
                        console.error("[Worker] PDF Retry with 'new' failed:", retryErr);
                        throw new Error(`PDF Parsing failed: ${pdfErr.message}`);
                    }
                } else {
                    console.error("[Worker] PDF Parsing failed:", pdfErr);
                    throw new Error(`PDF Parsing failed: ${pdfErr.message}`);
                }
            }
        }
        else if (
            fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            (originalName && (originalName.endsWith('.docx') || originalName.endsWith('.doc'))) ||
            fileType.includes('msword')
        ) {
            const result = await mammoth.extractRawText({ path: filePath });
            extractedText = `[WORD]\n${result.value}`;
        }
        else if (
            fileType.includes('spreadsheet') ||
            fileType.includes('excel') ||
            (originalName && (originalName.endsWith('.xlsx') || originalName.endsWith('.xls')))
        ) {
            const workbook = XLSX.readFile(filePath);
            let result = "";
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const text = XLSX.utils.sheet_to_txt(sheet);
                result += `--- Sheet: ${sheetName} ---\n${text}\n\n`;
            });
            extractedText = `[EXCEL]\n${result}`;
        }
        else {
            extractedText = "Format not supported for server-side extraction.";
        }

        // 3. Update Database
        if (isInventory) {
            // NEW: Update Inventory Slot (JSON manipulation)
            // NEW: Update Inventory Slot (JSON manipulation) - Wrapped in Promise
            const slotId = context.slotId;
            const ordnerId = context.ordnerId;
            const invoiceId = context.invoiceId;

            await new Promise((resolve, reject) => {
                db.get("SELECT box_data, boxData FROM inventory WHERE id = ?", [slotId], (err, row) => {
                    if (err) return reject(new Error(`[Worker] Failed to fetch inventory ${slotId}: ${err.message}`));
                    if (!row) return reject(new Error(`[Worker] Inventory ${slotId} not found`));

                    try {
                        const raw = row.box_data || row.boxData;
                        const box = typeof raw === 'string' ? JSON.parse(raw) : raw;
                        let updated = false;

                        if (box && box.ordners) {
                            box.ordners.forEach(ord => {
                                if (ord.id == ordnerId && ord.invoices) {
                                    ord.invoices.forEach(inv => {
                                        if (inv.id == invoiceId) {
                                            inv.ocrContent = extractedText;
                                            updated = true;
                                        }
                                    });
                                }
                            });

                            if (updated) {
                                db.run("UPDATE inventory SET box_data = ?, boxData = NULL WHERE id = ?",
                                    [JSON.stringify(box), slotId],
                                    (upErr) => {
                                        if (upErr) reject(new Error(`[Worker] Failed to update inventory ${slotId} with OCR: ${upErr.message}`));
                                        else {
                                            console.log(`[Worker] Inventory OCR Completed & Saved: Slot ${slotId}, Invoice ${invoiceId}`);
                                            resolve();
                                        }
                                    }
                                );
                            } else {
                                console.warn(`[Worker] Invoice ${invoiceId} not found in Ordner ${ordnerId}`);
                                resolve(); // Treat as success to avoid retry loops for logical errors
                            }
                        } else {
                            resolve();
                        }
                    } catch (pe) {
                        reject(new Error(`[Worker] JSON Parse error for inventory: ${pe.message}`));
                    }
                });
            });

        } else {
            // Standard Document Update
            const currentDoc = await db.getDocumentById(docId);
            if (currentDoc) {
                // Merge OCR and set status to 'done' (or just update content)
                const newDoc = { ...currentDoc, ocrContent: extractedText, status: 'done' };
                await db.updateDocument(docId, newDoc);
                console.log(`[Worker] Document OCR Completed: ${docId}`);
            } else {
                console.error(`[Worker] Document ${docId} not found in DB.`);
            }
        }

    } catch (err) {
        console.error(`[Worker] Job ${job.id} Failed:`, err);
        throw err;
    }

}, {
    connection,
    concurrency: 2 // Enable parallel processing
});

worker.on('completed', job => {
    console.log(`[Worker] Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
    console.log(`[Worker] Job ${job.id} has failed with ${err.message}`);
});

worker.on('error', err => {
    console.error('[Worker] Fatal Error:', err.message);
});

console.log("[Worker] OCR Worker Started...");
