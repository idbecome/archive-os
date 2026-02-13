import mysql from 'mysql2';

const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');

    // Check headers
    connection.query("SHOW COLUMNS FROM master_tax_objects", (err, rows) => {
        if (err) console.error(err);
        else console.log("Columns:", rows.map(r => r.Field).join(', '));

        // Check data
        connection.query("SELECT id, name, note, CASE WHEN vector IS NULL THEN 'NULL' ELSE 'PRESENT' END as vector_status FROM master_tax_objects LIMIT 10", (err, rows) => {
            if (err) console.error(err);
            else console.log("Data Sample:", JSON.stringify(rows, null, 2));

            connection.end();
        });
    });
});
