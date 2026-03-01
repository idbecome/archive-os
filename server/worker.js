import fs from 'fs';
import path from 'path';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { pathToFileURL } from 'url';
import { knex } from './db.js';
import { JOB_STATUS, DOC_STATUS } from './constants/status.js';
import { generateEmbedding, parseIntent, generateAnswer, vectorStore } from './ai_search.js';
import { Worker } from 'bullmq';
import { connection, USE_BULLMQ } from './utils/queue.js';
import { io as ioClient } from 'socket.io-client';

// Connect to the main Node.js process to trigger UI refreshes
const socket = ioClient(`http://localhost:${process.env.PORT || 5005}`, { reconnection: true });

// PDF.js worker setup
const pdfjsWorkerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
const standardFontDataUrl = path.resolve('node_modules/pdfjs-dist/standard_fonts/');

if (!fs.existsSync(pdfjsWorkerPath)) {
    console.error("PDF.js Worker not found at:", pdfjsWorkerPath);
}

// Utility functions
const isPdfFile = (filePath) => {
    try {
        const buffer = Buffer.alloc(4);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 4, 0);
        fs.closeSync(fd);
        return buffer.toString() === '%PDF';
    } catch (e) { return false; }
};

const isImageFile = (filePath) => {
    try {
        const buffer = Buffer.alloc(4);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 4, 0);
        fs.closeSync(fd);
        const hex = buffer.toString('hex').toUpperCase();
        return hex.startsWith('FFD8FF') || hex.startsWith('89504E47') || hex.startsWith('47494638');
    } catch (e) { return false; }
};

async function extractImagesFromPDF(dataBuffer, maxImages = Infinity, job = null) {
    const images = [];
    try {
        const uint8Array = new Uint8Array(dataBuffer);
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            standardFontDataUrl: pathToFileURL(standardFontDataUrl).href
        });
        const pdfDocument = await loadingTask.promise;

        for (let i = 1; i <= pdfDocument.numPages; i++) {
            if (images.length >= maxImages) break;
            if (job) await job.updateProgress(Math.round((i / pdfDocument.numPages) * 100));

            const page = await pdfDocument.getPage(i);
            const operatorList = await page.getOperatorList();

            for (let j = 0; j < operatorList.fnArray.length; j++) {
                if (images.length >= maxImages) break;
                const fn = operatorList.fnArray[j];

                if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject) {
                    const objId = operatorList.argsArray[j][0];
                    try {
                        const image = await page.objs.get(objId);
                        if (image && image.data) {
                            const width = image.width;
                            const height = image.height;
                            const data = image.data;

                            const canvas = { width, height, data };
                            images.push(canvas);
                        }
                    } catch (imgErr) { console.warn("Skip image object:", objId); }
                }
            }
        }
    } catch (e) { console.error("PDF Image Extraction Failed:", e); }
    return images;
}

// Core Processing Logic
async function processJob(job) {
    const jobName = job.name || 'process-ocr';

    if (jobName === 'ai-chat') {
        const { message, history, user } = job.data;
        console.log(`[Worker] Processing AI Chat Job ${job.id} for user: ${user}`);
        try {
            const queryVector = await generateEmbedding(message);
            const intent = await parseIntent(message, queryVector);

            // Simplified RAG
            const docs = await knex('documents').orderBy('uploadDate', 'desc').limit(5);
            const contextData = docs.map(d => `Doc: ${d.title} Content: ${(d.ocrContent || '').substring(0, 200)}...`);
            const answer = await generateAnswer(message, contextData);

            const result = { reply: answer, intent: intent.type, context: contextData.slice(0, 3) };

            await knex('job_queue').where('id', job.id).update({
                result: JSON.stringify(result),
                status: JOB_STATUS.COMPLETED,
                finished_at: knex.fn.now()
            });
            return;
        } catch (err) {
            console.error(`[Worker] AI Chat Job ${job.id} Failed:`, err);
            throw err;
        }
    }

    if (jobName === 'ai-embedding') {
        const { text } = job.data;
        console.log(`[Worker] Processing AI Embedding Job ${job.id}`);
        try {
            const vector = await generateEmbedding(text);
            await knex('job_queue').where('id', job.id).update({
                result: JSON.stringify(vector),
                status: JOB_STATUS.COMPLETED,
                finished_at: knex.fn.now()
            });
            return;
        } catch (err) {
            console.error(`[Worker] AI Embedding Job ${job.id} Failed:`, err);
            throw err;
        }
    }

    // Default: OCR Job
    const { docId, filePath, fileType, originalName, context, forceOcr } = job.data;
    const isInventory = context && context.type === 'inventory';
    console.log(`[Worker] Processing OCR Job ${job.id} for ${isInventory ? 'Inventory' : 'Document'}: ${docId}`);

    try {
        if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

        let extractedText = "";
        let shouldProcess = true;

        if (docId && String(docId).toLowerCase().startsWith('doc')) { // Real docId check
            const existingData = await knex('documents').select('ocrContent').where('id', docId).first();
            if (existingData && existingData.ocrContent && existingData.ocrContent.trim().length > 50) {
                extractedText = existingData.ocrContent;
                shouldProcess = false;
            }
        }

        if (shouldProcess) {
            let effectiveFileType = fileType;
            if (isPdfFile(filePath)) effectiveFileType = 'application/pdf';

            if (effectiveFileType.startsWith('image/')) {
                const tess = await createWorker('eng+ind');
                const { data: { text } } = await tess.recognize(filePath);
                extractedText = `[OCR IMAGE]\n${text}`;
                await tess.terminate();
            } else if (effectiveFileType === 'application/pdf') {
                const dataBuffer = fs.readFileSync(filePath);
                let pdfText = "";
                try {
                    const uint8Array = new Uint8Array(dataBuffer);
                    const loadingTask = pdfjsLib.getDocument({ data: uint8Array, standardFontDataUrl: pathToFileURL(standardFontDataUrl).href });
                    const pdfDocument = await loadingTask.promise;
                    for (let i = 1; i <= Math.min(pdfDocument.numPages, 50); i++) {
                        const page = await pdfDocument.getPage(i);
                        const tokenizedText = await page.getTextContent();
                        pdfText += tokenizedText.items.map(t => t.str).join(' ') + "\n";
                    }
                } catch (e) {
                    try {
                        const parser = new PDFParse({ data: dataBuffer });
                        const pdfResult = await parser.getText();
                        pdfText = pdfResult.text || "";
                        await parser.destroy();
                    } catch (pdfErr) {
                        console.error("PDF Parsing Fallback Failed:", pdfErr);
                    }
                }
                extractedText = pdfText.trim();
                // If text is thin, try OCR via canvas rendering
                if (forceOcr || extractedText.length < 50) {
                    console.log(`[Worker] Thin text in PDF detected. Rasterizing pages for OCR...`);
                    try {
                        const { createCanvas } = await import('canvas');
                        const images = [];
                        const uint8Array = new Uint8Array(dataBuffer);
                        const loadingTask = pdfjsLib.getDocument({ data: uint8Array, standardFontDataUrl: pathToFileURL(standardFontDataUrl).href });
                        const pdfDocument = await loadingTask.promise;

                        for (let i = 1; i <= Math.min(pdfDocument.numPages, 10); i++) {
                            const page = await pdfDocument.getPage(i);
                            const viewport = page.getViewport({ scale: 2.0 }); // High-res scale
                            const canvas = createCanvas(viewport.width, viewport.height);
                            const ctx = canvas.getContext('2d');

                            // Fix for Tesseract: Force white background since canvas defaults to transparent
                            ctx.fillStyle = 'white';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);

                            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                            const buffer = canvas.toBuffer('image/png');
                            images.push(buffer);
                        }

                        // Run Tesseract on each rasterized page
                        if (images.length > 0) {
                            let rasterText = "";
                            const tess = await createWorker('eng+ind');
                            for (let imgBuf of images) {
                                const { data: { text } } = await tess.recognize(imgBuf);
                                rasterText += text + "\n";
                            }
                            await tess.terminate();
                            extractedText = `[SCAN-DETECTED]\n${rasterText.trim()}`;
                        }
                    } catch (canvasErr) {
                        console.error("[Worker] Canvas Rasterization failed:", canvasErr);
                        extractedText = `[SCAN-DETECTED]\n${extractedText}`;
                    }
                }
            } else if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
                const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
                extractedText = workbook.SheetNames.map(n => XLSX.utils.sheet_to_txt(workbook.Sheets[n])).join("\n\n");
            } else if (fileType.includes('word') || filePath.endsWith('.docx')) {
                const res = await mammoth.extractRawText({ path: filePath });
                extractedText = res.value;
            } else if (fileType.includes('powerpoint') || fileType.includes('presentation') || filePath.endsWith('.pptx')) {
                try {
                    const data = fs.readFileSync(filePath);
                    const zip = new JSZip();
                    const contents = await zip.loadAsync(data);
                    let pptText = "";

                    // PPTX stores text in ppt/slides/slide*.xml
                    for (const filename of Object.keys(contents.files)) {
                        if (filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')) {
                            const xml = await contents.files[filename].async("string");
                            // Grab anything between <a:t> and </a:t>
                            const matches = xml.match(/<a:t.*?>(.*?)<\/a:t>/g);
                            if (matches) {
                                pptText += matches.map(m => m.replace(/<.*?>/g, '')).join(' ') + "\n";
                            }
                        }
                    }
                    extractedText = pptText.trim();
                } catch (pptErr) {
                    console.error("PPTX Parsing Failed:", pptErr);
                }
            }
        }

        // Database updates
        if (isInventory || (context && context.type === 'inventory_invoice')) {
            const slotId = context.slotId || context.slot_id;
            const invoiceId = context.invoiceId || context.invoice_id;

            console.log(`[Worker] Updating Inventory: Slot=${slotId}, Invoice=${invoiceId}`);

            if (slotId && invoiceId) {
                const row = await knex('inventory').select('box_data').where('id', slotId).first();
                if (row) {
                    let box = typeof row.box_data === 'string' ? JSON.parse(row.box_data) : row.box_data;
                    let changed = false;
                    box.ordners?.forEach(ord => ord.invoices?.forEach(inv => {
                        if (inv.id == invoiceId) {
                            inv.ocrContent = extractedText;
                            inv.status = DOC_STATUS.DONE;
                            changed = true;
                        }
                    }));
                    if (changed) {
                        await knex('inventory').where('id', slotId).update({ box_data: JSON.stringify(box) });
                        console.log(`[Worker] Inventory updated successfully for Slot ${slotId}`);
                    } else {
                        console.warn(`[Worker] Invoice ${invoiceId} not found in Slot ${slotId}`);
                    }
                }
            }
        }
        if (docId) {
            const docExists = await knex('documents').where('id', docId).first();
            if (docExists) {
                await knex('documents').where('id', docId).update({ ocrContent: extractedText, status: DOC_STATUS.DONE });
                console.log(`[Worker] Updated document ${docId} with OCR results.`);
            }
        }

        // --- NEW: Update Tax Audit Notes ---
        if (context && context.type === 'tax_note') {
            const noteId = context.noteId;
            console.log(`[Worker] Updating Tax Audit Note: ${noteId}`);
            if (noteId) {
                await knex('tax_audit_notes').where('id', noteId).update({ ocrContent: extractedText });
                console.log(`[Worker] Tax Note ${noteId} updated with OCR content.`);
            }
        }

        // Embedding
        if (extractedText.length > 10) {
            const vector = await generateEmbedding(extractedText);
            const vectorJson = JSON.stringify(vector);
            if (docId) {
                await knex('documents').where('id', docId).update({ vector: vectorJson });
                const updatedDoc = await knex('documents').where('id', docId).first();
                if (updatedDoc) vectorStore.upsertDocument(updatedDoc, vector);
            }
        }

        // --- UI REFRESH: Relay end-of-process signal to main server ---
        try {
            console.log(`[Worker] Emitting data:changed relay via IPC socket...`);
            socket.emit('worker:update', { channel: 'documents' });
            socket.emit('worker:update', { channel: 'inventory' });
            socket.emit('worker:update', { channel: 'tax' });
        } catch (se) {
            console.error('[Worker] Socket emit failed:', se);
        }

    } catch (err) {
        console.error(`[Worker] Job ${job.id} Failed:`, err);
        throw err;
    }
}

async function startPolling() {
    console.log("[Worker] Starting MySQL Polling...");
    await knex('job_queue').where('status', JOB_STATUS.ACTIVE).update({ status: JOB_STATUS.WAITING });

    const poll = async () => {
        try {
            const row = await knex('job_queue')
                .where('status', JOB_STATUS.WAITING)
                .orderBy('created_at', 'asc')
                .first();

            if (row) {
                console.log(`[Worker] Found Job: ${row.id} (${row.name})`);
                await knex('job_queue').where('id', row.id).update({ status: JOB_STATUS.ACTIVE, processed_at: knex.fn.now() });
                const job = { id: row.id, name: row.name, data: JSON.parse(row.data || '{}'), updateProgress: async (p) => await knex('job_queue').where('id', row.id).update({ progress: p }) };
                try {
                    await processJob(job);
                    await knex('job_queue').where('id', row.id).update({ status: JOB_STATUS.COMPLETED, finished_at: knex.fn.now(), progress: 100 });
                } catch (e) {
                    const retries = (row.retries || 0) + 1;
                    if (retries < (row.max_attempts || 3)) {
                        await knex('job_queue').where('id', row.id).update({ status: JOB_STATUS.WAITING, retries, error: e.message });
                    } else {
                        await knex('job_queue').where('id', row.id).update({ status: JOB_STATUS.FAILED, finished_at: knex.fn.now(), error: e.message });
                    }
                }
                setTimeout(poll, 100);
            } else setTimeout(poll, 2000);
        } catch (e) { console.error("[Worker] Poll Error:", e); setTimeout(poll, 5000); }
    };
    poll();
}

async function startWorkerSystem() {
    console.log("[Worker] Initializing Queue System...");
    // Give Redis a moment to initialize connection
    await new Promise(resolve => setTimeout(resolve, 2500));

    if (USE_BULLMQ) {
        console.log("🚀 [Worker] BullMQ Active. Starting Redis Event-Driven Worker...");
        const worker = new Worker('ocr-processor', async job => {
            const context = JSON.parse(job.data.context || '{}');
            const jobData = {
                id: job.id,
                name: 'process-ocr',
                data: {
                    docId: job.data.docId,
                    filePath: job.data.filename,
                    fileType: job.data.fileType || '',
                    originalName: job.data.originalName || '',
                    context: context
                }
            };
            return await processJob(jobData);
        }, { connection });

        worker.on('completed', job => {
            console.log(`[Worker] BullMQ Job ${job.id} completed successfully!`);
        });

        worker.on('failed', (job, err) => {
            console.error(`[Worker] BullMQ Job ${job.id} failed:`, err);
        });
    } else {
        console.log("🐌 [Worker] BullMQ Inactive. Starting MySQL Polling Fallback...");
        startPolling();
    }
}

startWorkerSystem();
