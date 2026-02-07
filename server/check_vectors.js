
import db from './db.js';

db.all("SELECT count(*) as total FROM documents", [], (err, rows) => {
    console.log("Total Documents:", rows[0].total);

    db.all("SELECT count(*) as vectorized FROM documents WHERE vector IS NOT NULL", [], (err, rows) => {
        console.log("Vectorized Documents:", rows[0].vectorized);
        if (rows[0].vectorized === 0) {
            console.log("\nWARNING: No documents have embeddings! You need to run a migration/backfill.");
        }
    });
});
