import fs from 'fs';
import path from 'path';
import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { pathToFileURL } from 'url';

// MONKEY PATCH for node-canvas ImageData to ignore colorSpace
import canvas from 'canvas';
const OriginalImageData = canvas.ImageData;
canvas.ImageData = function (data, width, height, settings) {
    if (height === undefined) {
        // Handle (data, width) signature
        return new OriginalImageData(data, width);
    }
    // Ignore settings (the 4th argument which contains colorSpace)
    return new OriginalImageData(data, width, height);
};
// Ensure global ImageData is also patched if PDF.js uses it
global.ImageData = canvas.ImageData;

const pdfjsWorkerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(pdfjsWorkerPath).href;

const standardFontDataUrl = path.resolve('node_modules/pdfjs-dist/standard_fonts/');
const filePath = 'uploads/1772373658938-Dokumen 2.pdf';

async function debug() {
    try {
        console.log("Reading PDF:", filePath);
        const dataBuffer = fs.readFileSync(filePath);
        const uint8Array = new Uint8Array(dataBuffer);

        console.log("Loading PDF via PDF.js...");
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            standardFontDataUrl: pathToFileURL(standardFontDataUrl).href
        });
        const pdfDocument = await loadingTask.promise;

        const page = await pdfDocument.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvasObj = createCanvas(viewport.width, viewport.height);
        const ctx = canvasObj.getContext('2d');

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasObj.width, canvasObj.height);

        console.log("Rendering page to canvas (with ImageData patch)...");
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        const buffer = canvasObj.toBuffer('image/png');
        fs.writeFileSync('debug_raster.png', buffer);
        console.log("Rasterized page saved to debug_raster.png");

        console.log("Running Tesseract...");
        const worker = await createWorker('eng+ind');
        const { data: { text } } = await worker.recognize(buffer);
        console.log("OCR RESULT START:");
        console.log(text.substring(0, 500));
        console.log("OCR RESULT END");
        await worker.terminate();

    } catch (e) {
        console.error("DEBUG FAILED:", e);
    } finally {
        process.exit(0);
    }
}

debug();
