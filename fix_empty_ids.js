
import { knex } from './server/db.js';

async function fixIds() {
    try {
        console.log("Deleting documents with empty string IDs...");
        const count = await knex('documents').where('id', '').del();
        console.log(`Deleted ${count} rows with empty IDs.`);
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

fixIds();
