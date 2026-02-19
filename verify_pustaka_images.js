import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';
import path from 'path';

const API_URL = 'http://localhost:5000/api';
const UPLOADS_URL = 'http://localhost:5000';

async function verifyImageFlow() {
    console.log("--- Starting Pustaka Image Verification ---");

    // 1. Create a dummy image file
    const testFilePath = path.resolve('test_image.txt');
    fs.writeFileSync(testFilePath, 'DUMMY IMAGE CONTENT');

    try {
        // 2. Upload the file
        console.log("Uploading file...");
        const formData = new FormData();
        formData.append('file', fs.createReadStream(testFilePath));

        const uploadRes = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        if (!uploadRes.ok) {
            throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
        }

        const uploadData = await uploadRes.json();
        console.log("Upload Response:", uploadData);

        if (!uploadData.url) {
            throw new Error("Upload response missing 'url' field");
        }

        const fileUrl = uploadData.url;
        console.log(`File URL from response: ${fileUrl}`);

        // 3. Try to access the file
        // Construct full URL. If returns '/uploads/...' need to prepend host.
        const accessUrl = fileUrl.startsWith('http') ? fileUrl : `${UPLOADS_URL}${fileUrl}`;
        console.log(`Attempting to fetch from: ${accessUrl}`);

        const accessRes = await fetch(accessUrl);
        if (accessRes.ok) {
            console.log("[SUCCESS] Image file is accessible!");
        } else {
            console.error(`[FAILURE] Could not access image file. Status: ${accessRes.status}`);
        }

    } catch (error) {
        console.error("[ERROR]", error.message);
    } finally {
        // Cleanup
        if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    }
}

verifyImageFlow();
