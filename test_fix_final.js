import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

// LOGGING
const logStream = fs.createWriteStream('debug_output.txt');
function log(msg) {
    console.log(msg);
    logStream.write(msg + '\n');
}

async function run() {
    try {
        log("STARTING FINAL TEST (v2)");

        // 1. IMPORT CANVAS
        log("Importing canvas...");
        const canvasModule = await import('canvas');
        const { createCanvas, CanvasRenderingContext2D } = canvasModule;
        const OriginalImageData = canvasModule.ImageData;

        // 2. MONKEY PATCH GLOBALLY
        log("Applying Monkey Patch to global.ImageData...");
        global.ImageData = function (data, width, height, settings) {
            if (height === undefined) return new OriginalImageData(data, width);
            // Ignore settings (the 4th argument)
            return new OriginalImageData(data, width, height);
        };
        // Copy prototype for instanceof checks
        global.ImageData.prototype = OriginalImageData.prototype;

        log("Applying Monkey Patch to CanvasRenderingContext2D.prototype.createImageData...");
        const originalCreateImageData = CanvasRenderingContext2D.prototype.createImageData;
        CanvasRenderingContext2D.prototype.createImageData = function (w, h, settings) {
            // PDF.js 5.x passes { colorSpace: '...' } as 3rd arg
            return originalCreateImageData.call(this, w, h);
        };

        // 3. DYNAMICALLY IMPORT PDFJS AFTER PATCH
        log("Importing pdfjs...");
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const { createWorker } = await import('tesseract.js');

        const pdfjsWorkerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(pdfjsWorkerPath).href;

        const standardFontDataUrl = path.resolve('node_modules/pdfjs-dist/standard_fonts/');
        const filePath = 'uploads/1770945383046-Efin Shogo date.pdf';

        if (!fs.existsSync(filePath)) {
            log("ERROR: File not found: " + filePath);
            return;
        }

        log("Reading PDF: " + filePath);
        const dataBuffer = fs.readFileSync(filePath);
        const uint8Array = new Uint8Array(dataBuffer);

        log("Loading PDF via PDF.js...");
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            standardFontDataUrl: pathToFileURL(standardFontDataUrl).href
        });
        const pdfDocument = await loadingTask.promise;
        log("PDF Loaded. Pages: " + pdfDocument.numPages);

        const page = await pdfDocument.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvasObj = createCanvas(viewport.width, viewport.height);
        const ctx = canvasObj.getContext('2d');

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasObj.width, canvasObj.height);

        log("Rendering page to canvas...");
        const renderTask = page.render({ canvasContext: ctx, viewport: viewport });
        await renderTask.promise;
        log("Rendering completed!");

        const buffer = canvasObj.toBuffer('image/png');
        fs.writeFileSync('debug_raster_final.png', buffer);
        log("Buffer saved to debug_raster_final.png. Size: " + buffer.length);

        log("Running Tesseract...");
        const worker = await createWorker('eng+ind');
        const { data: { text } } = await worker.recognize(buffer);
        log("OCR RESULT LENGTH: " + text.length);
        log("OCR RESULT START:\n" + text.substring(0, 500));
        await worker.terminate();
        log("FINISHED SUCCESSFULLY");

    } catch (e) {
        log("FATAL ERROR: " + e.stack);
    } finally {
        logStream.end();
        process.exit(0);
    }
}

run();
