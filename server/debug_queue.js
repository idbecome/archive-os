
import db from './db.js';

// Query waiting/active jobs
db.all("SELECT * FROM job_queue WHERE status IN ('waiting', 'active') ORDER BY created_at ASC", [], (err, rows) => {
    if (err) {
        console.error("Error fetching jobs:", err);
        return;
    }
    console.log("--- JOB QUEUE (Last 20) ---");
    rows.forEach(r => {
        console.log(`[${r.id}] Status: ${r.status} | Name: ${r.name} | Created: ${r.created_at}`);
        try {
            const data = JSON.parse(r.data);
            console.log(`    Data: DocID=${data.docId}, File=${data.originalName}, Path=${data.filePath}`);
        } catch (e) {
            console.log(`    Data: ${r.data}`);
        }
    });
    console.log("---------------------------");
});
