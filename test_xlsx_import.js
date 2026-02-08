import * as XLSX from 'xlsx';
import fs from 'fs';

console.log('XLSX keys:', Object.keys(XLSX));
if (XLSX.default) {
    console.log('XLSX.default keys:', Object.keys(XLSX.default));
}

try {
    console.log('Testing XLSX.readFile...');
    // We don't need a real file if we just want to check if it's a function
    console.log('type of XLSX.readFile:', typeof XLSX.readFile);
    if (XLSX.default && typeof XLSX.default.readFile === 'function') {
        console.log('XLSX.default.readFile is a function');
    }
} catch (e) {
    console.error('Error during test:', e);
}
