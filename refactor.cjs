const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'server/controllers');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'authController.js');

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Check if it has res.status(500)
    if (content.includes('status(500)')) {
        // Add import at the top if not exists
        if (!content.includes('errorHandler.js')) {
            content = "import { handleError } from '../utils/errorHandler.js';\n" + content;
        }

        let contextName = file.replace('Controller.js', '').toUpperCase() + ' Error';

        // Regex to match: res.status(500).json({ error: err.message });
        const regexObj = /res\.status\(500\)\.json\(\s*\{\s*(?:error|message)\s*:\s*([a-zA-Z0-9_]+)\.message\s*\}\s*\)\s*;?/g;
        content = content.replace(regexObj, (match, errVar) => {
            return `handleError(res, ${errVar}, "${contextName}");`;
        });

        // Match string errors: res.status(500).json({ error: "Something" });
        const regexStr = /res\.status\(500\)\.json\(\s*\{\s*(?:error|message)\s*:\s*"([^"]+)"\s*\}\s*\)\s*;?/g;
        content = content.replace(regexStr, (match, errStr) => {
            return `handleError(res, new Error("${errStr}"), "${contextName}");`;
        });

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Refactored: ' + file);
        }
    }
}
