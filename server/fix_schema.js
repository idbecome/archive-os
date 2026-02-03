import mysql from 'mysql2';

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os'
});

console.log("Fixing schema...");

pool.query("ALTER TABLE inventory ADD COLUMN lastUpdated DATETIME", (err) => {
    if (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log("Column lastUpdated already exists.");
        } else {
            console.error("Error adding lastUpdated:", err.message);
        }
    } else {
        console.log("Column lastUpdated added successfully.");
    }

    // Check other potentially missing columns
    pool.query("ALTER TABLE inventory ADD COLUMN boxData TEXT", (err) => {
        if (!err) console.log("Column boxData added.");
    });
    pool.query("ALTER TABLE inventory ADD COLUMN history TEXT", (err) => {
        if (!err) console.log("Column history added.");
    });

    setTimeout(() => {
        pool.end();
        process.exit(0);
    }, 1000);
});
