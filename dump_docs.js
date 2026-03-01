import fs from 'fs';
import { knex } from './server/db.js';

async function run() {
    try {
        const docs = await knex('documents').select('id', 'title', 'status', 'ocrContent');
        const output = docs.map(d => `ID: ${d.id} | Title: ${d.title} | Status: ${d.status} | OCR Preview: ${(d.ocrContent || '').substring(0, 50)}`).join('\n');
        fs.writeFileSync('docs_list.txt', output);
        console.log('Done writing docs_list.txt');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
