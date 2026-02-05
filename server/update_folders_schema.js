import db from './db.js';

console.log("Updating folders table schema...");

const updateSchema = async () => {
    try {
        await new Promise((resolve, reject) => {
            db.run("ALTER TABLE folders ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP", [], (err) => {
                if (err && !err.message.includes("duplicate column")) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
        console.log("Successfully added createdAt column to folders table.");
    } catch (error) {
        console.error("Error updating schema:", error);
    } finally {
        // We don't close the pool here because db.js manages it, and this is a script.
        // In a real script we might want to force close, but for now process.exit is fine or let it hang for a sec.
        console.log("Schema update complete.");
        process.exit(0);
    }
};

updateSchema();
