import { createCanvas } from 'canvas';
import { createWorker } from 'tesseract.js';
import fs from 'fs';

async function test() {
    try {
        console.log("Testing Canvas...");
        const canvas = createCanvas(200, 100);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 200, 100);
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText('HELLO WORLD', 10, 50);

        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync('test_ocr.png', buffer);
        console.log("Canvas written to test_ocr.png");

        console.log("Testing Tesseract...");
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(buffer);
        console.log("OCR Result:", text);
        await worker.terminate();

        if (text.includes('HELLO')) {
            console.log("SUCCESS: OCR works.");
        } else {
            console.log("FAILURE: OCR returned incorrect text.");
        }
    } catch (e) {
        console.error("TEST FAILED:", e);
    } finally {
        process.exit(0);
    }
}

test();
