import mysql from 'mysql2';

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os'
});

pool.query("DESCRIBE tax_audits", (err, rows) => {
    if (err) console.error(err);
    else console.log(rows);
    process.exit();
});
