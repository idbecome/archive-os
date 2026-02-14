import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || ''
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
        process.exit(1);
    }
    console.log('Connected to MySQL server.');

    connection.query("CREATE DATABASE IF NOT EXISTS archive_os", (err) => {
        if (err) {
            console.error('Error creating database:', err.message);
            process.exit(1);
        }
        console.log('Database "archive_os" created or already exists.');
        connection.end();
        process.exit(0);
    });
});
