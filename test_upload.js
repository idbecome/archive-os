import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:5000/api/upload';

async function testUpload() {
    // Create a dummy file
    const filePath = path.join(__dirname, 'test_invoice.txt');
    fs.writeFileSync(filePath, 'This is a test invoice content.');

    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(filePath)], { type: 'text/plain' });
    formData.append('file', fileBlob, 'test_invoice.txt');

    try {
        console.log("Uploading file...");
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Upload Success!", data);

        if (data.success && data.url.startsWith('/uploads/INV-')) {
            console.log("Verification Passed: URL format is correct.");
        } else {
            console.error("Verification Failed: Unexpected response format.");
        }

    } catch (error) {
        console.error("Upload Failed:", error);
    } finally {
        // Cleanup
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
}

testUpload();
