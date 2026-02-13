import mysql from 'mysql2';

const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os'
});

connection.connect((err) => {
    if (err) throw err;

    console.log("Searching for 'Persewaan' and 'Konstruksi'...");
    connection.query("SELECT id, name FROM master_tax_objects WHERE name LIKE '%Persewaan%' OR name LIKE '%Konstruksi%' LIMIT 10", (err, rows) => {
        if (err) console.error(err);
        else console.log("Result:", JSON.stringify(rows, null, 2));
        connection.end();
    });
});
