
import db from './db.js';

console.log("Checking for stuck 'processing' documents...");

// 1. Get all documents with status 'processing'
db.all("SELECT id, title, status, ocrContent FROM documents WHERE status = 'processing'", [], (err, docs) => {
    if (err) {
        console.error("Error fetching documents:", err);
        return;
    }

    if (docs.length === 0) {
        console.log("No documents found with status 'processing'.");
        return;
    }

    console.log(`Found ${docs.length} documents with status 'processing':`);
    const ids = docs.map(d => d.id);
    const placeholders = ids.map(() => '?').join(',');

    // Set status to 'ready' and add a note to ocrContent if empty
    db.run(`UPDATE documents SET status = 'ready', ocrContent = CASE WHEN ocrContent IS NULL OR ocrContent = '' THEN '[OCR Reset] Process stuck, status reset.' ELSE ocrContent END WHERE id IN (${placeholders})`, ids, (err) => {
        if (err) console.error("Failed to reset zombies:", err);
        else console.log("Successfully reset status for:", ids.join(', '));
    });
});
