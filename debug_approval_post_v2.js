
import fetch from 'node-fetch';

async function testPostApproval() {
    try {
        console.log("Testing POST /api/approvals (Initiate Approval)...");

        console.log("Fetching flows to get valid ID...");
        const flowRes = await fetch('http://localhost:5000/api/approval-flows');
        const flows = await flowRes.json();
        const validFlowId = 3;
        console.log(`Using Flow ID: ${validFlowId}`);

        const payload = {
            title: "Debug Approval Refactor",
            description: "Testing controller validation",
            division: "IT",
            requester_name: "Admin User",
            requester_username: "admin",
            flow_id: validFlowId,
            steps: [
                { username: "manager", name: "Manager" },
                { username: "director", name: "Director" }
            ]
        };

        console.log("Sending payload:", JSON.stringify(payload));

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
