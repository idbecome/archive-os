import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api/pustaka';

async function run() {
    console.log("--- Testing Pustaka API ---");

    // 1. Get Guides
    try {
        console.log("Fetching guides...");
        const res = await fetch(`${API_URL}/guides`);
        if (res.ok) {
            const data = await res.json();
            console.log(`[SUCCESS] Fetched ${data.length} guides.`);
        } else {
            console.error(`[FAILURE] Fetch guides failed: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.error("Response:", text);
        }
    } catch (e) {
        console.error("[ERROR] Fetch guides:", e.message);
    }

    // 2. Create Guide
    let guideId = null;
    try {
        console.log("\nCreating new guide...");
        const payload = {
            title: "Test Guide " + Date.now(),
            category: "Operasional",
            description: "Test Description",
            icon: "BookOpen",
            privacy: "public",
            owner: null // Test if null owner causes 500
        };
        const res = await fetch(`${API_URL}/guides`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            guideId = data.id;
            console.log(`[SUCCESS] Created guide ID: ${guideId}`);
        } else {
            console.error(`[FAILURE] Create guide failed: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.error("Response:", text);
        }
    } catch (e) {
        console.error("[ERROR] Create guide:", e.message);
    }

    // 3. Edit Guide
    if (guideId) {
        try {
            console.log(`\nUpdating guide ${guideId}...`);
            const updatePayload = {
                title: "Updated Test Guide",
                category: "Teknis"
            };
            const res = await fetch(`${API_URL}/guides/${guideId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            });

            if (res.ok) {
                console.log(`[SUCCESS] Updated guide ${guideId}`);
            } else {
                console.error(`[FAILURE] Update guide failed: ${res.status} ${res.statusText}`);
                const text = await res.text();
                console.error("Response:", text);
            }
        } catch (e) {
            console.error("[ERROR] Update guide:", e.message);
        }

        // 3.5 Create Slide (to test foreign key constraints on delete)
        if (guideId) {
            try {
                console.log(`\nAdding slide to guide ${guideId}...`);
                const slidePayload = {
                    guide_id: guideId,
                    title: "Test Slide",
                    content: "Content",
                    order_index: 1
                };
                const res = await fetch(`${API_URL}/slides`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(slidePayload)
                });
                if (res.ok) {
                    console.log(`[SUCCESS] Added slide to guide ${guideId}`);
                } else {
                    console.error(`[FAILURE] Add slide failed: ${res.status}`);
                }
            } catch (e) {
                console.error("[ERROR] Add slide:", e.message);
            }
        }

        // 4. Delete Guide
        try {
            console.log(`\nDeleting guide ${guideId}...`);
            const res = await fetch(`${API_URL}/guides/${guideId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                console.log(`[SUCCESS] Deleted guide ${guideId}`);
            } else {
                console.error(`[FAILURE] Delete guide failed: ${res.status} ${res.statusText}`);
            }
        } catch (e) {
            console.error("[ERROR] Delete guide:", e.message);
        }
    }
}

run();
