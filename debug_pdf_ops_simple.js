import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const filePath = 'uploads/1772373658938-Dokumen 2.pdf';

async function debug() {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const uint8Array = new Uint8Array(dataBuffer);

        // No worker, no static fonts - just for operator list
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            disableFontFace: true
        });
        const pdfDocument = await loadingTask.promise;
        const page = await pdfDocument.getPage(1);
        const operatorList = await page.getOperatorList();

        console.log("Total Operators:", operatorList.fnArray.length);
        const counts = {};
        for (let fn of operatorList.fnArray) {
            counts[fn] = (counts[fn] || 0) + 1;
        }
        console.log("Operator Types Found:", JSON.stringify(counts));

        // Let's check for specific image codes
        // OPS.paintImageXObject = 82
        // OPS.paintInlineImageXObject = 83
        if (counts[82]) console.log("Found paintImageXObject:", counts[82]);
        if (counts[83]) console.log("Found paintInlineImageXObject:", counts[83]);

    } catch (e) {
        console.error("DEBUG FAILED:", e);
    } finally {
        process.exit(0);
    }
}

debug();
