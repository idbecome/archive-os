import mysql from 'mysql2';

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log('Applying schema updates for Tax Monitoring...');

const updates = [
    // Add auditId and stepIndex to documents table
    "ALTER TABLE documents ADD COLUMN auditId VARCHAR(255)",
    "ALTER TABLE documents ADD COLUMN stepIndex INT"
];

const runUpdates = async () => {
    for (const sql of updates) {
        try {
            await pool.promise().query(sql);
            console.log(`Executed: ${sql}`);
        } catch (err) {
            // Ignore "Duplicate column" errors
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log(`Skipped (already exists): ${sql}`);
            } else {
                console.error(`Error executing ${sql}:`, err.message);
            }
        }
    }
    console.log('Schema update complete.');
    process.exit(0);
};

runUpdates();
