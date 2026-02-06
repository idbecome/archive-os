import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./archive.db');

db.all("SELECT * FROM folders", [], (err, rows) => {
    if (err) {
        console.error("Error:", err);
    } else {
        console.log("Folders found:", rows.length);
        console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
});
