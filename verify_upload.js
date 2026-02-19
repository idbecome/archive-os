
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:5000/api/documents/upload';
const BOUNDARY = '--------------------------735323031399963166993862';

async function run() {
    try {
        console.log("Starting verification...");

        // Create dummy file
        const filePath = path.join(__dirname, 'test_upload.txt');
        fs.writeFileSync(filePath, 'Hello World Content');

        // Use native Node.js FormData (Node 18+)
        const fileContent = fs.readFileSync(filePath);
        const filename = 'test_upload.txt';
        const formData = new FormData();
        formData.append('title', `Test Document ${Date.now()}`);
        formData.append('owner', 'Verifier');

        // Create Blob from file content
        const blob = new Blob([fileContent], { type: 'text/plain' });
        formData.append('file', blob, filename);

        console.log("Uploading...");
        const res = await fetch(API_URL, {
            method: 'POST',
            body: formData,
            headers: {
                'x-user-id': '1'
            }
        });

        if (!res.ok) {
            console.error("Upload failed:", res.status, res.statusText, await res.text());
            return;
        }

        const json = await res.json();
        console.log("Upload response:", json);

        // Verify listing
        console.log("Verifying listing...");
        const listRes = await fetch(`${API_URL.replace('/upload', '')}?folderId=null`, {
            headers: { 'x-user-id': '1' }
        });
        const list = await listRes.json();

        const found = list.find(d => d.id === json.id);
        if (found) {
            console.log("SUCCESS: Document found in list!");
            console.log("Found Doc:", found.title, found.folderId);
        } else {
            console.error("FAILURE: Document NOT found in list.");
            console.log("List IDs:", list.map(d => d.id));
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
