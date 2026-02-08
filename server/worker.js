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

// Worker Processor
const worker = new Worker('OCR_QUEUE', async (job) => {
    const { docId, filePath, fileType, originalName } = job.data;
    console.log(`[Worker] Processing Job ${job.id} for DocID: ${docId}`);

    try {
        // 1. Validate File
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        // 2. Update Status to PROCESSING (if not already)
        // await db.updateDocument(docId, { status: 'processing' }); // Optional specific field

        let extractedText = "";

        // 3. Extract Text based on Type
        if (fileType.startsWith('image/')) {
            const tess = await createWorker('eng+ind');
            const { data: { text } } = await tess.recognize(filePath);
            await tess.terminate();
            extractedText = `[OCR IMAGE]\n${text}`;
        }
        else if (fileType === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath);

            // Detection for pdf-parse v2+ (Class) or v1 (Function)
            const PDFParser = typeof pdf === 'function'
                ? pdf
                : (pdf.PDFParse || (pdf.default && (pdf.default.PDFParse || (typeof pdf.default === 'function' ? pdf.default : null))) || pdf.default);

            if (!PDFParser) {
                console.error("[Worker] PDF Library Error: Could not find parser in", pdf);
                throw new Error("PDF parsing library not initialized correctly.");
            }

            try {
                // Try as class constructor first (v2 API)
                if (PDFParser.prototype && PDFParser.prototype.constructor) {
                    const parser = new PDFParser({ data: dataBuffer });
                    const result = await parser.getText();
                    extractedText = `[PDF]\n${result.text || ''}`;
                    if (parser.destroy) await parser.destroy();
                } else {
                    // Fallback to function (v1 API)
                    const data = await PDFParser(dataBuffer);
                    extractedText = `[PDF]\n${data.text || ''}`;
                }
            } catch (pdfErr) {
                console.warn("[Worker] Preferred PDF parser failed, trying fallback...", pdfErr.message);
                // Last ditch effort: if it was a class but failed, try it as a function
                try {
                    const data = await PDFParser(dataBuffer);
                    extractedText = `[PDF]\n${data.text || ''}`;
                } catch (fail) {
                    throw new Error(`PDF Parsing failed: ${pdfErr.message}`);
                }
            }
        }
        else if (
            fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            originalName.endsWith('.docx') ||
            originalName.endsWith('.doc') ||
            fileType.includes('msword')
        ) {
            // Mammoth is primarily for .docx, for legacy .doc it might fail but it's our best pure JS attempt
            const result = await mammoth.extractRawText({ path: filePath });
            extractedText = `[WORD]\n${result.value}`;
        }
        else if (
            fileType.includes('spreadsheet') ||
            fileType.includes('excel') ||
            originalName.endsWith('.xlsx') ||
            originalName.endsWith('.xls')
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
        else if (
            fileType.includes('presentation') ||
            fileType.includes('powerpoint') ||
            originalName.endsWith('.pptx')
        ) {
            try {
                const data = await fs.readFile(filePath);
                const zip = await JSZip.loadAsync(data);
                let fullText = "";
                let slideIndex = 1;

                const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
                slideFiles.sort((a, b) => {
                    const numA = parseInt(a.replace(/\D/g, ''));
                    const numB = parseInt(b.replace(/\D/g, ''));
                    return numA - numB;
                });

                for (const filename of slideFiles) {
                    const content = await zip.file(filename).async('text');
                    // Simple regex to extract content between <a:t> and </a:t>
                    const matches = content.match(/<a:t>([^<]+)<\/a:t>/g);
                    let slideText = "";
                    if (matches) {
                        slideText = matches.map(m => m.replace(/<a:t>|<\/a:t>/g, '')).join(' ');
                    }
                    fullText += `--- Slide ${slideIndex} ---\n${slideText}\n\n`;
                    slideIndex++;
                }
                extractedText = `[POWERPOINT]\n${fullText}`;
            } catch (pptxErr) {
                console.error("PPTX Extraction Error:", pptxErr);
                extractedText = `[POWERPOINT] Gagal ekstraksi: ${pptxErr.message}`;
            }
        }
        else {
            extractedText = "Format not supported for server-side extraction.";
        }

        // 4. Update Database
        // We need to fetch the current doc to merge or just update specific fields
        // Assuming db.updateDocument handles merge or we pass what we want to update

        // RE-FETCH to ensure we have latest state if needed, or just update
        // We'll trust db.updateDocument to handle it.
        // We also update the Vector if possible, but that might be separate.

        // For now, just update Text and Status
        const updatePayload = {
            ocrContent: extractedText,
            // status: 'ready' // If we add a status field
        };

        // We should check if db.updateDocument exists and works with partial updates
        // server/db.js usually interacts with JSON file or SQLite

        // Let's assume we can pass partial update.
        // We might need to implement a specific method in db.js if it doesn't support it.

        // Reading db to make sure we don't overwrite other fields blindly
        const currentDoc = await db.getDocumentById(docId);
        if (currentDoc) {
            const newDoc = { ...currentDoc, ...updatePayload };
            await db.updateDocument(docId, newDoc);
            console.log(`[Worker] Job ${job.id} Completed. OCR updated.`);
        } else {
            console.error(`[Worker] Document ${docId} not found in DB.`);
        }

    } catch (err) {
        console.error(`[Worker] Job ${job.id} Failed:`, err);
        throw err;
    }

}, { connection });

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
