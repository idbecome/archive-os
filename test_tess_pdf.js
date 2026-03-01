import { createWorker } from 'tesseract.js';
import fs from 'fs';

const filePath = 'uploads/1772373658938-Dokumen 2.pdf';

async function test() {
    try {
        console.log("Testing Tesseract.js NATIVE PDF support on:", filePath);
        const worker = await createWorker('eng+ind');

        // Tesseract.js 5+ should support PDF if ghostscript/pdf.js is not needed?
        // Actually, it usually needs image buffers. Let's see if it takes a PDF buffer.
        const buffer = fs.readFileSync(filePath);
        const { data: { text } } = await worker.recognize(buffer);

        console.log("OCR RESULT START:");
        console.log(text.substring(0, 500));
        console.log("OCR RESULT END");
        await worker.terminate();
    } catch (e) {
        console.error("TEST FAILED:", e);
    } finally {
        process.exit(0);
    }
}

test();
