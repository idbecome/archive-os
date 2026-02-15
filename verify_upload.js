
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:5000/api/documents';
const BOUNDARY = '--------------------------735323031399963166993862';

async function run() {
    try {
        console.log("Starting verification...");

        // Create dummy file
        const filePath = path.join(__dirname, 'test_upload.txt');
        fs.writeFileSync(filePath, 'Hello World Content');

        // Construct multipart body manually because Node native FormData can be tricky with fetch in some envs
        const fileContent = fs.readFileSync(filePath);
        const filename = 'test_upload.txt';

        const bodyStart =
            `--${BOUNDARY}
Content-Disposition: form-data; name="title"

Test Document ${Date.now()}
--${BOUNDARY}
Content-Disposition: form-data; name="owner"

Verifier
--${BOUNDARY}
Content-Disposition: form-data; name="file"; filename="${filename}"
Content-Type: text/plain

`;
        const bodyEnd = `\r\n--${BOUNDARY}--`;

        const body = Buffer.concat([
            Buffer.from(bodyStart.replace(/\n/g, '\r\n')), // Ensure CRLF
            fileContent,
            Buffer.from(bodyEnd)
        ]);

        console.log("Uploading...");
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${BOUNDARY}`
            },
            body: body
        });

        if (!res.ok) {
            console.error("Upload failed:", res.status, res.statusText, await res.text());
            return;
        }

        const json = await res.json();
        console.log("Upload response:", json);

        // Verify listing
        console.log("Verifying listing...");
        const listRes = await fetch(`${API_URL}?folderId=null`);
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
