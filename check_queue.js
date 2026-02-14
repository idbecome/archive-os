
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkQueue() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'archive_os'
    });

    try {
        if (process.argv.includes('--reset')) {
            const [res] = await connection.execute("UPDATE job_queue SET status = 'waiting', error = NULL WHERE status = 'failed'");
            console.log(`Reset ${res.affectedRows} failed jobs to waiting.`);
        }

        const [waiting] = await connection.execute("SELECT * FROM job_queue WHERE status = 'waiting' ORDER BY created_at ASC");
        console.log("Waiting Jobs:", waiting.length);
        if (waiting.length > 0) console.table(waiting.map(r => ({ id: r.id, name: r.name, created_at: r.created_at })));

        const [active] = await connection.execute("SELECT * FROM job_queue WHERE status = 'active' ORDER BY created_at ASC");
        console.log("\nActive Jobs:", active.length);
        if (active.length > 0) console.table(active.map(r => ({ id: r.id, name: r.name, processed_at: r.processed_at })));

        const [failed] = await connection.execute("SELECT * FROM job_queue WHERE status = 'failed' ORDER BY finished_at DESC LIMIT 5");
        console.log("\nRecent Failed Jobs:");
        console.table(failed.map(r => ({ id: r.id, name: r.name, error: r.error ? r.error.substring(0, 100) : null })));

    } catch (e) {
        console.error("Error checking queue:", e);
    } finally {
        await connection.end();
    }
}

checkQueue();
