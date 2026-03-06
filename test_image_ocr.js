import { createWorker } from 'tesseract.js';
import fs from 'fs';

const filePath = 'uploads/1770953251123-image.png';

async function test() {
    try {
        if (!fs.existsSync(filePath)) {
            console.log("File not found:", filePath);
            return;
        }
        console.log("Testing Tesseract on:", filePath);
        const worker = await createWorker('eng+ind');
        const { data: { text } } = await worker.recognize(filePath);
        console.log("OCR RESULT START:");
        console.log(text);
        console.log("OCR RESULT END");
        await worker.terminate();
    } catch (e) {
        console.error("TEST FAILED:", e);
    } finally {
        process.exit(0);
    }
}

test();
