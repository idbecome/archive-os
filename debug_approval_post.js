
import fetch from 'node-fetch';

async function testPostApproval() {
    try {
        console.log("Testing POST /api/approvals (Initiate Approval)...");
        const payload = {
            documentId: "DOC-001",
            flowId: 1,
            requester: "admin"
        };

        const res = await fetch('http://localhost:5000/api/approvals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log(`Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log("Body:", text);
    } catch (err) {
        console.error("Fetch failed:", err);
    }
}

testPostApproval();
