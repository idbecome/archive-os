import mysql from 'mysql2';

const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os'
});

connection.connect((err) => {
    if (err) throw err;

    const query = "SELECT id, name, note FROM master_tax_objects WHERE name LIKE '%Sewa%' OR name LIKE '%Bangunan%' OR name LIKE '%Konstruksi%'";
    connection.query(query, (err, rows) => {
        if (err) console.error(err);
        else console.log("Matching Rows:", JSON.stringify(rows, null, 2));
        connection.end();
    });
});
