import mysql from 'mysql2';

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os',
    waitForConnections: false
});

console.log("Checking MySQL DB...");

pool.query("SHOW TABLES LIKE 'folders'", (err, rows) => {
    if (err) {
        console.error("Error checking table:", err);
    } else {
        console.log("Table 'folders' exists:", rows.length > 0);
        if (rows.length > 0) {
            pool.query("SELECT * FROM folders", (err2, rows2) => {
                if (err2) console.error(err2);
                else {
                    console.log("Folders count:", rows2.length);
                    console.log("Details:", JSON.stringify(rows2, null, 2));
                }
                process.exit();
            });
        } else {
            process.exit();
        }
    }
});
