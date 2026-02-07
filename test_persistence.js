import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:5000/api';

async function testPersistence() {
    // 1. Upload File
    const filePath = path.join(__dirname, 'persist_test.txt');
    fs.writeFileSync(filePath, 'Persistence Test Content');

    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(filePath)], { type: 'text/plain' });
    formData.append('file', fileBlob, 'persist_test.txt');

    console.log("1. Uploading file...");
    const uploadRes = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
    const uploadData = await uploadRes.json();

    if (!uploadData.success) throw new Error("Upload failed");
    const fileUrl = uploadData.url;
    console.log("   Uploaded URL:", fileUrl);

    // 2. Get Inventory Item (ID 1)
    console.log("2. Fetching Inventory ID 1...");
    const getRes = await fetch(`${API_URL}/inventory`);
    const inventory = await getRes.json();
    const item = inventory.find(i => i.id == 1); // Assuming ID 1 exists

    if (!item) {
        console.warn("   Item ID 1 not found, using first item.");
    }
    const targetItem = item || inventory[0];
    console.log("   Target Item ID:", targetItem.id);

    // 3. Update Inventory with new File URL
    const newBoxData = {
        id: targetItem.boxData?.id || 'TEST-BOX',
        ordners: [
            {
                id: Date.now(),
                noOrdner: 'TEST-ORD',
                period: '2024',
                invoices: [
                    {
                        id: Date.now(),
                        invoiceNo: 'TEST-INV',
                        file: fileUrl, // <--- THE KEY
                        fileName: 'persist_test.txt'
                    }
                ]
            }
        ]
    };

    console.log("3. Updating Inventory...");
    const updateRes = await fetch(`${API_URL}/inventory/${targetItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: 'STORED',
            lastUpdated: new Date().toISOString(),
            boxData: newBoxData, // Frontend sends object
            box_data: JSON.stringify(newBoxData), // Frontend sends string to new column
            history: []
        })
    });

    if (!updateRes.ok) console.error("   Update Failed:", await updateRes.text());
    else console.log("   Update Success");

    // 4. Fetch Again to Verify
    console.log("4. Verifying Persistence...");
    const verifyRes = await fetch(`${API_URL}/inventory`);
    const verifyInventory = await verifyRes.json();
    const verifyItem = verifyInventory.find(i => i.id == targetItem.id);

    const savedFileUrl = verifyItem.boxData?.ordners?.[0]?.invoices?.[0]?.file;
    console.log("   Saved File URL:", savedFileUrl);

    if (savedFileUrl === fileUrl) {
        console.log("✅ SUCCESS: File URL persisted correctly!");
    } else {
        console.error("❌ FAILURE: File URL mismatch or missing.");
    }

    // Cleanup
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

testPersistence();
