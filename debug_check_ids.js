
import { knex } from './server/db.js';

async function checkIds() {
    try {
        console.log("Checking 'documents' table for missing IDs...");
        const docs = await knex('documents').select('*');

        let emptyStringIds = 0;
        let validIds = 0;
        let missingIds = 0;
        let nullIds = 0;
        let total = docs.length;

        docs.forEach((d, idx) => {
            if (d.id === undefined) {
                console.log(`Row ${idx} missing ID field:`, d);
                missingIds++;
            } else if (d.id === null) {
                console.log(`Row ${idx} has null ID:`, d);
                nullIds++;
            } else if (d.id === '') {
                console.log(`Row ${idx} has EMPTY STRING ID:`, d.title);
                emptyStringIds++;
            } else {
                validIds++;
            }
        });

        console.log(`Total Docs: ${total}`);
        console.log(`Valid IDs: ${validIds}`);
        console.log(`Missing IDs: ${missingIds}`);
        console.log(`Null IDs: ${nullIds}`);
        console.log(`Empty String IDs: ${emptyStringIds}`);

        if (total > 0) {
            console.log("Sample Doc:", docs[0]);
        }

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

checkIds();
