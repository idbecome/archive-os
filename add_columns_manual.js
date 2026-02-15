
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function runManualMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'archive_os'
    });

    try {
        console.log("Adding columns to inventory...");

        // Add rack
        try {
            await connection.query("ALTER TABLE inventory ADD COLUMN rack VARCHAR(10)");
            console.log("Added column: rack");
        } catch (e) {
            console.log("Column rack might already exist or error:", e.message);
        }

        // Add shelf
        try {
            await connection.query("ALTER TABLE inventory ADD COLUMN shelf INT");
            console.log("Added column: shelf");
        } catch (e) {
            console.log("Column shelf might already exist or error:", e.message);
        }

        // Add position
        try {
            await connection.query("ALTER TABLE inventory ADD COLUMN position INT");
            console.log("Added column: position");
        } catch (e) {
            console.log("Column position might already exist or error:", e.message);
        }

        // Seed Data
        console.log("Seeding coordinate data...");
        const [rows] = await connection.query("SELECT id FROM inventory ORDER BY id");
        const racks = ['A', 'B', 'C', 'D', 'E'];

        for (let i = 0; i < rows.length; i++) {
            const id = rows[i].id;
            const rackIdx = Math.floor(i / 20);
            const rack = racks[rackIdx] || 'Z';
            const remainder = i % 20;
            const shelf = Math.floor(remainder / 4) + 1;
            const position = (remainder % 4) + 1;

            await connection.query("UPDATE inventory SET rack=?, shelf=?, position=? WHERE id=?", [rack, shelf, position, id]);
        }
        console.log("Seeding complete.");

    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await connection.end();
    }
}

runManualMigration();
