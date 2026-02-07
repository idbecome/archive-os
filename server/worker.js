import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';
import fs from 'fs';
import { createWorker } from 'tesseract.js';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import db from './db.js';

// Redis Connection
const connection = new IORedis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null,
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
            const data = await pdf(dataBuffer);
            extractedText = `[PDF]\n${data.text}`;
            // NOTE: For scanned PDFs, pdf-parse might fail to get text.
            // We can add fallback to pdf-to-image -> tesseract here if needed.
        }
        else if (
            fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            originalName.endsWith('.docx')
        ) {
            const result = await mammoth.extractRawText({ path: filePath });
            extractedText = `[WORD]\n${result.value}`;
        }
        else if (
            fileType.includes('spreadsheet') ||
            fileType.includes('excel') ||
            originalName.endsWith('.xlsx')
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

console.log("[Worker] OCR Worker Started...");
