import db from './db.js';

console.log('--- UPGRADING DATABASE SCHEMA ---');
console.log('Target: inventory.boxData -> LONGTEXT');

const sql = "ALTER TABLE inventory MODIFY boxData LONGTEXT";

db.run(sql, [], (err) => {
    if (err) {
        console.error('FAILED to upgrade schema:', err.message);
        process.exit(1);
    } else {
        console.log('SUCCESS: Schema upgraded. boxData is now LONGTEXT.');
        setTimeout(() => {
            db.close();
            process.exit(0);
        }, 1000);
    }
});
