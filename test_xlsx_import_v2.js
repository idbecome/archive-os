import XLSX from 'xlsx';

console.log('Testing XLSX.readFile with default import...');
console.log('type of XLSX.readFile:', typeof XLSX.readFile);
if (typeof XLSX.readFile === 'function') {
    console.log('Success: XLSX.readFile is a function');
} else {
    console.log('Failure: XLSX.readFile is still not a function');
}
