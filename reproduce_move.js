import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';
const DOC_ID = '1771028609438'; // Hardcoded from previous step

async function testMove(targetFolderId, description) {
    console.log(`\nTesting: ${description} (targetFolderId: ${targetFolderId})`);
    try {
        const res = await fetch(`${API_URL}/documents/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: DOC_ID, targetFolderId, owner: 'TestUser' })
        });
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Response: ${text}`);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

async function run() {
    // 1. Get a valid folder
    let validFolderId = null;
    try {
        const fRes = await fetch(`${API_URL}/folders`);
        const folders = await fRes.json();
        if (folders.length > 0) {
            validFolderId = folders[0].id;
            console.log(`Found valid folder: ${validFolderId} (${folders[0].name})`);
        }
    } catch (e) { console.error("Failed to fetch folders"); }

    await testMove(null, "Move to Root (null)");

    if (validFolderId) {
        await testMove(validFolderId, "Move to Existing Folder");
    }

    await testMove("99999999999", "Move to Non-Existent Folder");
    await testMove("null", "Move to 'null' string");
}

run();
