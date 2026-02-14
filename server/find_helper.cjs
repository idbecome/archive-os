const fs = require('fs');
const content = fs.readFileSync('server/index.js', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('const saveBase64ToFile') || line.includes('function saveBase64ToFile')) {
        console.log(`Found at line ${index + 1}: ${line.trim()}`);
    }
});
