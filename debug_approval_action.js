
import fetch from 'node-fetch';
import FormData from 'form-data';

async function testApprove() {
    try {
        const approvalId = 4; // From previous test
        console.log(`Testing POST /api/approvals/${approvalId}/action (Approve Step)...`);

        const form = new FormData();
        form.append('action', 'Approve');
        form.append('note', 'Approved via debug script');
        form.append('username', 'manager'); // First step approver

        const res = await fetch(`http://localhost:5000/api/approvals/${approvalId}/action`, {
            method: 'POST',
            body: form
        });

        console.log(`Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log("Body:", text);
    } catch (err) {
        console.error("Fetch failed:", err);
    }
}

testApprove();
