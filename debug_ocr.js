import fs from 'fs';
import { knex } from './server/db.js';

async function run() {
    try {
        const id = '1772373042216';
        const doc = await knex('documents').where('id', id).first();
        if (doc) {
            fs.writeFileSync('tmp_ocr.txt', doc.ocrContent || '');
            console.log('Done writing tmp_ocr.txt');
        } else {
            console.log('Doc not found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
