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

console.log('Applying schema updates v2 for Tax Monitoring...');

const updates = [
    "ALTER TABLE tax_audits ADD COLUMN letterNumber VARCHAR(100)",
    "ALTER TABLE tax_audits ADD COLUMN startDate DATETIME"
];

const runUpdates = async () => {
    for (const sql of updates) {
        try {
            await pool.promise().query(sql);
            console.log(`Executed: ${sql}`);
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log(`Skipped (already exists): ${sql}`);
            } else {
                console.error(`Error executing ${sql}:`, err.message);
            }
        }
    }
    console.log('Schema update v2 complete.');
    process.exit(0);
};

runUpdates();
