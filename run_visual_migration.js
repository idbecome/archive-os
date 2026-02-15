
import { knex } from './server/db.js';

async function runMigration() {
    try {
        console.log("Running migration...");
        // Use config from knexfile (already loaded in db.js)
        await knex.migrate.latest();
        console.log("Migration successful.");

        // Verify columns
        const columnInfo = await knex('inventory').columnInfo();
        console.log("Inventory Columns:", Object.keys(columnInfo));

        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

runMigration();
