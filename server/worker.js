import path from 'path';
import fs from 'fs';
import { createWorker } from 'tesseract.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { knex } from './db.js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { generateEmbedding } from './ai_search.js';

import { pathToFileURL } from 'url';

// Configure PDF.js worker
const workerPath = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'legacy', 'build', 'pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

// Standard Font Path for PDF.js
const standardFontDataUrl = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts/');

// Helper: Detect if file is PDF by signature (Magic Bytes)
function isPdfFile(filePath) {
    try {
        const buffer = Buffer.alloc(4);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 4, 0);
        fs.closeSync(fd);
        return buffer.toString() === '%PDF';
    } catch (e) { return false; }
}

// Helper: Detect if file is Image by signature
function isImageFile(filePath) {
    try {
        const buffer = Buffer.alloc(12);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 12, 0);
        fs.closeSync(fd);

        // JPEG: FF D8 FF
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
        // PNG: 89 50 4E 47
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
        // BMP: 42 4D
        if (buffer[0] === 0x42 && buffer[1] === 0x4D) return true;
        // TIFF: 49 49 2A 00 or 4D 4D 00 2A
        if ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2A && buffer[3] === 0x00) ||
            (buffer[0] === 0x4D && buffer[1] === 0x4D && buffer[2] === 0x00 && buffer[3] === 0x2A)) return true;
        // WebP: RIFF ... WEBP
        if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return true;
        // GIF: GIF8
        if (buffer.toString('ascii', 0, 4) === 'GIF8') return true;

        return false;
    } catch (e) { return false; }
}

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
                    if (op === pdfjsLib.OPS.paintImageXObject || op === pdfjsLib.OPS.paintInlineImageXObject) {
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
    const { docId, filePath, fileType, originalName, context, forceOcr } = job.data;
    const isInventory = context && context.type === 'inventory';

    console.log(`[Worker] Processing Job ${job.id} for ${isInventory ? 'Inventory Invoice' : 'Document'}: ${docId}`);

    try {
        // 1. Validate File
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        // --- CHECK FOR EXISTING CLIENT-SIDE OCR ---
        const existingData = await knex('documents')
            .select('ocrContent')
            .where('id', docId)
            .first();

        let extractedText = "";
        let shouldProcess = true;

        if (existingData && existingData.ocrContent && existingData.ocrContent.trim().length > 50) {
            console.log(`[Worker] Client-side OCR found for DocID ${docId} (${existingData.ocrContent.length} chars). Skipping extraction.`);
            extractedText = existingData.ocrContent;
            shouldProcess = false;
        }

        if (shouldProcess) {
            // FIX: Auto-detect PDF signature to prevent Tesseract crash on PDF-as-Image
            let effectiveFileType = fileType;
            if (isPdfFile(filePath)) {
                console.log(`[Worker] Detected PDF signature for ${filePath}. Forcing type to application/pdf.`);
                effectiveFileType = 'application/pdf';
            } else if (effectiveFileType.startsWith('image/') && !isImageFile(filePath)) {
                console.warn(`[Worker] File ${filePath} has image MIME type but invalid signature. Skipping Tesseract.`);
                effectiveFileType = 'application/octet-stream';
            }

            // 2. OCR Hybrid logic (Internal Text extraction + Tesseract fallback)
            // ... (rest of the logic)


            if (effectiveFileType.startsWith('image/')) {
                let tess = null;
                try {
                    tess = await createWorker('eng+ind');
                    const { data: { text } } = await tess.recognize(filePath);
                    extractedText = `[OCR IMAGE]\n${text}`;
                } catch (ocrErr) {
                    console.error("[Worker] Tesseract Image OCR Failed:", ocrErr);
                    extractedText = `[OCR FAILED] ${ocrErr.message}`;
                } finally {
                    if (tess) await tess.terminate();
                }
            }
            else if (effectiveFileType === 'application/pdf') {
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

                    // Heuristic: Jika rata-rata teks per halaman sangat rendah, anggap sebagai hasil scan atau "Print to PDF" tanpa teks
                    if (totalTextLength / Math.min(numPages, 50) < 30) {
                        isScanned = true;
                    }
                } catch (e) {
                    console.error("[Worker] PDF.js Text Extraction Error:", e);
                    // Fallback ke pdf-parse untuk varian PDF dengan encoding kompleks (Print to PDF)
                    try {
                        console.log("[Worker] Attempting pdf-parse fallback...");
                        const data = await pdf(dataBuffer);
                        if (data && data.text) {
                            pdfText = data.text;
                            isScanned = pdfText.trim().length < 50;
                        }
                    } catch (e2) {
                        console.error("[Worker] pdf-parse fallback failed:", e2);
                    }
                }

                extractedText = pdfText.trim();

                // 2. Jika terdeteksi Scan, Teks Rendah, atau dipaksa (forceOcr), jalankan OCR berbasis Gambar
                if (forceOcr || isScanned || extractedText.length < 50) {
                    console.log('[Worker] PDF appears to be scanned or low text. Attempting OCR...');
                    try {
                        let images = await extractImagesFromPDF(dataBuffer, Infinity, job);
                        
                        // [FALLBACK] Jika ekstraksi objek gambar gagal (0 gambar), ini biasanya PDF vector tanpa text layer.
                        // Kita perlu melakukan rasterisasi halaman penuh.
                        if (images.length === 0) {
                            console.log('[Worker] No embedded images found. Attempting full page rasterization for vector-based PDF...');
                            try {
                                // Dynamic import untuk menangani dependensi opsional
                                const pdfImgConvert = await import('pdf-img-convert');
                                // Konversi PDF ke array gambar (Uint8Array)
                                const pageImages = await pdfImgConvert.convert(filePath, {
                                    width: 1200, // Resolusi tinggi untuk akurasi OCR yang lebih baik
                                    density: 200
                                });
                                if (pageImages && pageImages.length > 0) {
                                    console.log(`[Worker] Successfully rasterized ${pageImages.length} pages.`);
                                    images = pageImages;
                                }
                            } catch (rasterErr) {
                                console.warn('[Worker] Full page rasterization failed. Please run: npm install pdf-img-convert');
                            }
                        }

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
                                // Jika OCR dari gambar gagal mendapatkan teks, tandai untuk re-proses mendalam
                                console.warn('[Worker] OCR yielded no text from extracted images.');
                                extractedText = `[PDF-OCR-EMPTY]\n${extractedText}\n(Processed ${images.length} images, but no text found. Rasterization recommended.)`;
                            }
                        } else {
                            // Jika tidak ada gambar sama sekali, tandai sebagai file yang perlu dikonversi manual ke gambar (Rasterize)
                            console.log('[Worker] No text or images found. Marking for deep visual scan.');
                            extractedText = `[PDF-RASTER-REQUIRED]\n${extractedText}\n(Vector-based PDF detected, conversion to image required for OCR)`;
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
                fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                (originalName && (originalName.endsWith('.pptx')))
            ) {
                console.log(`[Worker] Starting PPTX extraction for: ${filePath}`);
                try {
                    const data = fs.readFileSync(filePath);
                    const zip = await JSZip.loadAsync(data);
                    let slideText = "";

                    // Find all slide files
                    const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));

                    // Sort by slide number (slide1, slide2, etc.)
                    slideFiles.sort((a, b) => {
                        const numA = parseInt(a.match(/slide(\d+)\.xml/)[1]);
                        const numB = parseInt(b.match(/slide(\d+)\.xml/)[1]);
                        return numA - numB;
                    });

                    for (const fileName of slideFiles) {
                        const slideXml = await zip.file(fileName).async('string');
                        // Simple regex to strip XML tags and find text content
                        // PPTX text is usually in <a:t>...</a:t>
                        const matches = slideXml.match(/<a:t>([^<]*)<\/a:t>/g);
                        if (matches) {
                            const text = matches.map(tag => tag.replace(/<\/?a:t>/g, '')).join(' ');
                            slideText += `--- Slide ${fileName.match(/slide(\d+)\.xml/)[1]} ---\n${text}\n\n`;
                        }
                    }
                    extractedText = `[POWERPOINT]\n${slideText}`;
                } catch (pptxErr) {
                    console.error("[Worker] PPTX Extraction Failed:", pptxErr);
                    extractedText = `[PPTX-ERROR] ${pptxErr.message}`;
                }
            }
            else if (
                fileType === 'text/plain' ||
                (originalName && originalName.endsWith('.txt'))
            ) {
                const text = fs.readFileSync(filePath, 'utf-8');
                extractedText = `[TEXT-FILE]\n${text}`;
            }
            else if (
                fileType.includes('spreadsheet') ||
                fileType.includes('excel') ||
                (originalName && (originalName.endsWith('.xlsx') || originalName.endsWith('.xls')))
            ) {
                console.log(`[Worker] Starting Excel extraction for: ${filePath}`);
                const data = fs.readFileSync(filePath);
                const workbook = XLSX.read(data, { type: 'buffer' });
                let result = "";
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const text = XLSX.utils.sheet_to_txt(sheet);
                    result += `--- Sheet: ${sheetName} ---\n${text}\n\n`;
                });
                extractedText = `[EXCEL]\n${result}`;
            }
        }

        // 3. Update Database
        if (isInventory) {
            // NEW: Update Inventory Slot (JSON manipulation)
            // NEW: Update Inventory Slot (JSON manipulation) - Wrapped in Promise
            const slotId = context.slotId;
            const ordnerId = context.ordnerId;
            const invoiceId = context.invoiceId;

            const row = await knex('inventory').select('box_data').where('id', slotId).first();
            if (!row) throw new Error(`[Worker] Inventory ${slotId} not found`);

            let box;
            try {
                const raw = row.box_data;
                box = typeof raw === 'string' ? JSON.parse(raw) : raw;
            } catch (e) {
                throw new Error(`[Worker] Corrupt Inventory JSON for ${slotId}`);
            }

            try {
                let updated = false;
                if (box && box.ordners) {
                    box.ordners.forEach(ord => {
                        if (ord.id == ordnerId && ord.invoices) {
                            ord.invoices.forEach(inv => {
                                if (inv.id == invoiceId) {
                                    inv.ocrContent = extractedText;
                            inv.status = 'done'; // Update status di JSON agar UI berhenti loading
                                    updated = true;
                                }
                            });
                        }
                    });

                    if (updated) {
                        await knex('inventory')
                            .where('id', slotId)
                            .update({ box_data: JSON.stringify(box) });
                        console.log(`[Worker] Inventory OCR Completed & Saved: Slot ${slotId}, Invoice ${invoiceId}`);
                    } else {
                        console.warn(`[Worker] Invoice ${invoiceId} not found in Ordner ${ordnerId}`);
                    }
                }
            } catch (pe) {
                throw new Error(`[Worker] Processing error for inventory: ${pe.message}`);
            }
        }

        if (context && context.type === 'approval') {
            const approvalId = context.approvalId;
            await knex('approvals')
                .where('id', approvalId)
                .update({ ocr_content: extractedText });
            console.log(`[Worker] Approval OCR Completed: ${approvalId}`);
        } else if (docId) {
            // Standard Document OR Inventory Document
            // Memperbarui tabel documents sangat penting agar frontend (docList) 
            // mengetahui bahwa proses OCR telah selesai dan menghentikan animasi loading.
            await knex('documents')
                .where('id', docId)
                .update({
                    ocrContent: extractedText,
                    status: 'done'
                });
            console.log(`[Worker] Document OCR Status Updated to Done: ${docId}`);
        }

        // 4. Generate & Save AI Embedding (Background)
        if (extractedText && extractedText.length > 10) {
            try {
                const vector = await generateEmbedding(extractedText);
                const vectorJson = JSON.stringify(vector);

                if (isInventory) {
                    // Update vector in the relational 'invoices' table
                    await knex('invoices')
                        .where('invoice_no', context.invoiceId)
                        .whereIn('ordner_ref_id', function () {
                            this.select('id').from('ordners').whereIn('box_ref_id', function () {
                                this.select('id').from('boxes').where('inventory_id', context.slotId);
                            });
                        })
                        .update({ vector: vectorJson });
                } else {
                    await knex('documents')
                        .where('id', docId)
                        .update({ vector: vectorJson });
                }
                console.log(`[Worker] AI Embedding Generated for: ${docId}`);
            } catch (vErr) {
                console.warn(`[Worker] AI Search Indexing Failed: ${vErr.message}`);
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

    // FIX: Reset stuck jobs on startup (Active/Processing -> Waiting)
    await knex('job_queue')
        .whereIn('status', ['active', 'processing'])
        .update({ status: 'waiting' });
    console.log("[Worker] Startup: Reset stuck jobs to 'waiting'.");

    const poll = async () => {
        try {
            // 1. Fetch one waiting job
            const row = await knex('job_queue')
                .whereIn('status', ['waiting', 'pending']) // Mendukung status 'pending' dari controller
                .orderBy('created_at', 'asc')
                .first();

            if (row) {
                // 2. Mark as Processing (sesuai dengan getOCRQueue)
                await knex('job_queue')
                    .where('id', row.id)
                    .update({
                        status: 'processing',
                        processed_at: knex.fn.now()
                    });

                // Construct Job Object
                let jobData;
                try {
                    jobData = JSON.parse(row.data || '{}');
                } catch (e) {
                    console.error(`[Worker] Job ${row.id} has corrupt JSON data. Marking failed.`);
                    await knex('job_queue')
                        .where('id', row.id)
                        .update({ status: 'failed', error: 'Corrupt JSON Data' });
                    return setTimeout(poll, 100);
                }

                const job = {
                    id: row.id,
                    data: jobData,
                    updateProgress: async (progress) => {
                        await knex('job_queue')
                            .where('id', row.id)
                            .update({ progress });
                    }
                };

                try {
                    // Race against timeout (3 minutes)
                    await Promise.race([
                        processOCRJob(job),
                        new Promise((_, reject) => setTimeout(() => reject(new Error("Job Timeout (3m)")), 180000))
                    ]);

                    // 3. Mark Completed
                    await knex('job_queue')
                        .where('id', row.id)
                        .update({
                            status: 'completed',
                            finished_at: knex.fn.now(),
                            progress: 100
                        });
                    setTimeout(poll, 100); // Process next immediately
                } catch (e) {
                    // 4. Mark Failed
                    console.error(`[Worker] Job ${row.id} Failed or Timed Out:`, e.message);
                    await knex('job_queue')
                        .where('id', row.id)
                        .update({
                            status: 'failed',
                            finished_at: knex.fn.now(),
                            error: e.message
                        });
                    setTimeout(poll, 1000);
                }
            } else {
                // No jobs, wait 2 seconds
                setTimeout(poll, 2000);
            }
        } catch (e) {
            console.error("[Worker] Critical Error:", e);
            setTimeout(poll, 5000);
        }
    };

    poll();
}

startPolling();
