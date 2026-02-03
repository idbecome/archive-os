import mysql from 'mysql2';

const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os'
});

console.log('Finalizing documents schema...');

const columns = [
    "ADD COLUMN url TEXT",
    "ADD COLUMN type VARCHAR(50)",
    "ADD COLUMN size VARCHAR(50)",
    "ADD COLUMN department VARCHAR(100)",
    "ADD COLUMN owner VARCHAR(100)"
];

let processed = 0;

columns.forEach(colSql => {
    connection.query(`ALTER TABLE documents ${colSql}`, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') {
            console.error(`Error executing ${colSql}:`, err.message);
        } else {
            console.log(`Success/Exists: ${colSql}`);
        }
        processed++;
        if (processed === columns.length) {
            console.log("Schema patch complete.");
            connection.end();
            process.exit(0);
        }
    });
});
