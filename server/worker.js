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

// Standard Font Path for PDF.js
const standardFontDataUrl = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts/');

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
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            standardFontDataUrl: pathToFileURL(standardFontDataUrl).href
        });
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

// Core Processing Logic (Decoupled from Queue System)
async function processOCRJob(job) {
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
            
            let pdfText = "";
            let isScanned = false;
            
            // 1. Try PDF.js Text Extraction (Better layout & reliability)
            try {
                const uint8Array = new Uint8Array(dataBuffer);
                const loadingTask = pdfjsLib.getDocument({
                    data: uint8Array,
                    standardFontDataUrl: pathToFileURL(standardFontDataUrl).href
                });
                const pdfDocument = await loadingTask.promise;
                
                const numPages = pdfDocument.numPages;
                let totalTextLength = 0;

                // Extract text from up to 50 pages
                for (let i = 1; i <= Math.min(numPages, 50); i++) {
                    const page = await pdfDocument.getPage(i);
                    const tokenizedText = await page.getTextContent();
                    const pageText = tokenizedText.items.map(token => token.str).join(' ');
                    pdfText += pageText + "\n";
                    totalTextLength += pageText.length;
                }
                
                // Heuristic: If average text per page < 50 chars, assume scanned
                if (totalTextLength / Math.min(numPages, 50) < 50) {
                    isScanned = true;
                }
            } catch (e) {
                console.error("[Worker] PDF.js Text Extraction Error:", e);
            }

            extractedText = pdfText.trim();

            // 2. If Scanned or Low Text, Try OCR on Images
            if (isScanned || extractedText.length < 50) {
                console.log('[Worker] PDF appears to be scanned or low text. Attempting OCR...');
                try {
                    const images = await extractImagesFromPDF(dataBuffer, Infinity, job);
                    if (images.length > 0) {
                        const tess = await createWorker('eng+ind');
                        let ocrText = "";
                        for (const imgBuffer of images) {
                            const { data: { text } } = await tess.recognize(imgBuffer);
                            ocrText += text + "\n";
                        }
                        await tess.terminate();
                        
                        if (ocrText.trim().length > 20) {
                            extractedText = `[OCR-SCAN]\n${ocrText}\n\n[METADATA]\n${extractedText}`;
                        } else {
                             extractedText = `[PDF-LOW-TEXT]\n${extractedText}\n(OCR yielded no text)`;
                        }
                    } else {
                         extractedText = `[PDF-NO-IMAGES]\n${extractedText}`;
                    }
                } catch (ocrErr) {
                    console.error("[Worker] OCR Failed:", ocrErr);
                    extractedText += `\n[OCR-ERROR] ${ocrErr.message}`;
                }
            } else {
                extractedText = `[PDF-NATIVE]\n${extractedText}`;
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
}

// --- POLLING WORKER (Replaces BullMQ/Redis) ---
async function startPolling() {
    console.log("[Worker] Starting MySQL Polling (No Redis)...");
    
    const poll = async () => {
        try {
            // 1. Fetch one waiting job
            db.get("SELECT * FROM job_queue WHERE status = 'waiting' ORDER BY created_at ASC LIMIT 1", [], async (err, row) => {
                if (err) {
                    console.error("[Worker] Poll Error:", err);
                    return setTimeout(poll, 5000);
                }

                if (row) {
                    // 2. Mark as Active
                    db.run("UPDATE job_queue SET status = 'active', processed_at = NOW() WHERE id = ?", [row.id], async () => {
                        
                        // Construct Job Object
                        const job = {
                            id: row.id,
                            data: JSON.parse(row.data),
                            updateProgress: async (progress) => {
                                db.run("UPDATE job_queue SET progress = ? WHERE id = ?", [progress, row.id], () => {});
                            }
                        };

                        try {
                            await processOCRJob(job);
                            // 3. Mark Completed
                            db.run("UPDATE job_queue SET status = 'completed', finished_at = NOW(), progress = 100 WHERE id = ?", [row.id], () => {
                                setTimeout(poll, 100); // Process next immediately
                            });
                        } catch (e) {
                            // 4. Mark Failed
                            db.run("UPDATE job_queue SET status = 'failed', finished_at = NOW(), error = ? WHERE id = ?", [e.message, row.id], () => {
                                setTimeout(poll, 1000);
                            });
                        }
                    });
                } else {
                    // No jobs, wait 2 seconds
                    setTimeout(poll, 2000);
                }
            });
        } catch (e) {
            console.error("[Worker] Critical Error:", e);
            setTimeout(poll, 5000);
        }
    };

    poll();
}

startPolling();
