import mysql from 'mysql2';

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os'
});

const id = 'test-' + Date.now();
const title = 'Test Audit 123';
const status = 'On Progress';
const currentStep = 1;
const steps = JSON.stringify([{ status: 'On Progress', notes: [] }]);
const letterNumber = 'SKP-999-TEST';
const startDate = '2023-11-20';

pool.query(
    "INSERT INTO tax_audits (id, title, status, currentStep, steps, letterNumber, startDate) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, title, status, currentStep, steps, letterNumber, startDate],
    (err, result) => {
        if (err) console.error("Insert Error:", err);
        else {
            console.log("Insert Success:", result);
            pool.query("SELECT * FROM tax_audits WHERE id = ?", [id], (err2, rows) => {
                if (err2) console.error("Fetch Error:", err2);
                else console.log("Fetched Data:", rows[0]);
                process.exit();
            });
        }
    }
);
