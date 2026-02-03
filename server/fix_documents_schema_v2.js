import mysql from 'mysql2';

const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os'
});

console.log('Adding fileData column to documents...');

connection.query("ALTER TABLE documents ADD COLUMN fileData LONGTEXT", (err) => {
    if (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log("Column fileData already exists.");
        } else {
            console.error("Error adding fileData:", err.message);
        }
    } else {
        console.log("Column fileData added successfully.");
    }

    // Also checking title length, maybe increase it
    connection.query("ALTER TABLE documents MODIFY title VARCHAR(500)", () => { });

    setTimeout(() => {
        connection.end();
        process.exit(0);
    }, 1000);
});
