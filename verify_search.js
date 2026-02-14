import db from './server/db.js';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function verifySearch() {
    console.log("Verifying Search Performance...");
    await wait(2000); // Wait for DB init

    // 1. Check Row Count
    db.all("SELECT COUNT(*) as count FROM inventory_items", [], (err, rows) => {
        if (err) {
            console.error("Error checking row count:", err);
            process.exit(1);
        }
        console.log(`Total items in inventory_items: ${rows[0].count}`);

        if (rows[0].count === 0) {
            console.warn("No items found! Migration might have failed or DB is empty.");
        }

        // 2. Run Search Query
        const query = "a"; // Broad search
        const term = `%${query}%`;
        const start = performance.now();

        const sql = `
            SELECT i.*
            FROM inventory_items i
            WHERE i.invoice_no LIKE ? OR i.vendor LIKE ? OR i.ocr_content LIKE ?
            LIMIT 50
        `;

        db.all(sql, [term, term, term], (err, results) => {
            const end = performance.now();
            if (err) {
                console.error("Search Query Failed:", err);
                process.exit(1);
            }

            console.log(`Search Query Time: ${(end - start).toFixed(2)}ms`);
            console.log(`Results Found: ${results.length}`);

            if (results.length > 0) {
                console.log("Sample Result:", results[0].invoice_no, results[0].vendor);
            }

            process.exit(0);
        });
    });
}

verifySearch();
