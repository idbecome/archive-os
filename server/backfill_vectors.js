
import db from './db.js';
import { getEmbedding } from './semantic.js';

async function backfill() {
    console.log("Starting backfill for embeddings...");

    // Fetch all documents WITHOUT vector
    db.all("SELECT id, title, ocrContent FROM documents WHERE vector IS NULL", [], async (err, rows) => {
        if (err) {
            console.error("DB Error:", err);
            return;
        }

        console.log(`Found ${rows.length} documents to process.`);

        for (const doc of rows) {
            console.log(`Processing: ${doc.title}...`);
            const textToEmbed = (doc.title + " " + (doc.ocrContent || "")).substring(0, 1000);

            try {
                const vector = await getEmbedding(textToEmbed);
                if (vector) {
                    await new Promise((resolve) => {
                        db.run("UPDATE documents SET vector = ? WHERE id = ?", [JSON.stringify(vector), doc.id], (updErr) => {
                            if (updErr) console.error(`Failed to update doc ${doc.id}:`, updErr);
                            else console.log(`Saved vector for doc ${doc.id}`);
                            resolve();
                        });
                    });
                }
            } catch (embedErr) {
                console.error(`Embedding failed for ${doc.id}:`, embedErr);
            }
        }

        console.log("Backfill complete!");
        process.exit(0);
    });
}

// Wait for DB connection
setTimeout(backfill, 2000);
