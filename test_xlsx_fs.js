import XLSX from 'xlsx';
import * as fs from 'fs';
import path from 'path';

// Create a dummy xlsx file for testing
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([['test']]);
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
const testFile = 'test.xlsx';

try {
    console.log('Testing XLSX.readFile WITHOUT set_fs...');
    // Note: XLSX.write with type 'file' also uses fs.
    // Let's use XLSX.writeFile which definitely uses fs.
    XLSX.writeFile(wb, testFile);
    console.log('Success: writeFile worked without set_fs');

    const workbook = XLSX.readFile(testFile);
    console.log('Success: readFile worked without set_fs');
} catch (e) {
    console.log('Failure: error without set_fs:', e.message);

    try {
        console.log('Testing XLSX.readFile WITH set_fs...');
        XLSX.set_fs(fs);
        XLSX.writeFile(wb, testFile);
        console.log('Success: writeFile worked with set_fs');
        const workbook = XLSX.readFile(testFile);
        console.log('Success: readFile worked with set_fs');
    } catch (e2) {
        console.log('Failure: error even with set_fs:', e2.message);
    }
} finally {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
}
