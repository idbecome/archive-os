
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error(err.message);
    else console.log('Connected to database at ' + dbPath);
});

db.serialize(() => {
    db.all("SELECT * FROM roles", [], (err, rows) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log("ROLES IN DB:", rows);
        }
    });
});

db.close();
