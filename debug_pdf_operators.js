import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { pathToFileURL } from 'url';

const pdfjsWorkerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(pdfjsWorkerPath).href;

const standardFontDataUrl = path.resolve('node_modules/pdfjs-dist/standard_fonts/');
const filePath = 'uploads/1772373658938-Dokumen 2.pdf';

async function debug() {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const uint8Array = new Uint8Array(dataBuffer);
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            standardFontDataUrl: pathToFileURL(standardFontDataUrl).href
        });
        const pdfDocument = await loadingTask.promise;
        const page = await pdfDocument.getPage(1);
        const operatorList = await page.getOperatorList();

        console.log("Total Operators:", operatorList.fnArray.length);
        const counts = {};
        for (let fn of operatorList.fnArray) {
            const name = Object.keys(pdfjsLib.OPS).find(key => pdfjsLib.OPS[key] === fn) || fn;
            counts[name] = (counts[name] || 0) + 1;
        }
        console.log("Operator Counts:", JSON.stringify(counts, null, 2));

    } catch (e) {
        console.error("DEBUG FAILED:", e);
    } finally {
        process.exit(0);
    }
}

debug();
