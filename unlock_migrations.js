
import { knex } from './server/db.js';

async function unlock() {
    try {
        console.log("Forcing unlock of migrations...");
        await knex.migrate.forceFreeMigrationsLock();
        console.log("Migrations unlocked.");
        process.exit(0);
    } catch (err) {
        console.error("Unlock failed:", err);
        process.exit(1);
    }
}

unlock();
