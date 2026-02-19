
import { knex } from './server/db.js';
import fs from 'fs';

async function migrate() {
    try {
        console.log("Running migrations (Utility Mode)...");
        await knex.migrate.latest();
        console.log("Migrations complete.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        fs.writeFileSync('migration_error.txt', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
        process.exit(1);
    }
}

migrate();
