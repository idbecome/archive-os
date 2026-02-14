
import db from './db.js';

console.log("Checking recent documents for OCR content...");

db.all("SELECT id, title, status, length(ocrContent) as ocrLen, uploadDate FROM documents ORDER BY uploadDate DESC LIMIT 10", [], (err, docs) => {
    if (err) {
        console.error("Error fetching docs:", err);
        return;
    }

    console.log("--- Recent Documents ---");
    docs.forEach(d => {
        console.log(`[${d.id}] ${d.title} | Status: ${d.status} | OCR Length: ${d.ocrLen || 0}`);
    });
    console.log("------------------------");
});
