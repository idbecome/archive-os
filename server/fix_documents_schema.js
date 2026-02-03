import mysql from 'mysql2';

const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os'
});

console.log('Fixing documents schema...');

connection.query("ALTER TABLE documents ADD COLUMN uploadDate DATETIME", (err) => {
    if (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log("Column uploadDate already exists.");
        } else {
            console.error("Error adding uploadDate:", err.message);
        }
    } else {
        console.log("Column uploadDate added successfully.");
    }

    // Also ensure ocrContent exists as user requested OCR
    connection.query("ALTER TABLE documents ADD COLUMN ocrContent LONGTEXT", (err) => {
        if (err) {
            if (err.code === 'ER_DUP_FIELDNAME') console.log("Column ocrContent already exists.");
            else console.error("Error adding ocrContent:", err.message);
        } else {
            console.log("Column ocrContent added.");
        }

        // Also check folderId just in case
        connection.query("ALTER TABLE documents ADD COLUMN folderId INT", (err) => {
            if (!err) console.log("Column folderId added.");

            connection.end();
            process.exit(0);
        });
    });
});
