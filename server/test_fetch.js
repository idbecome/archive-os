import mysql from 'mysql2';

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os'
});

pool.query("SELECT * FROM tax_audits", (err, rows) => {
    if (err) console.error(err);
    else {
        console.log("Total rows:", rows.length);
        if (rows.length > 0) {
            console.log("First row keys:", Object.keys(rows[0]));
            console.log("First row data:", rows[0]);
        }
    }
    process.exit();
});
