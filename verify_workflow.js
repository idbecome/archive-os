import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

async function test() {
    console.log("Testing Workflow Flows API...");
    try {
        // 1. Create a flow
        const createRes = await fetch(`${API_BASE}/approval-flows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Flow',
                description: 'Test Description',
                steps: [
                    { step_name: 'Step 1', approver_role: 'admin', order_index: 1 }
                ]
            })
        });
        const data = await createRes.json();
        console.log("Create Flow result:", data);

        if (data.id) {
            // 2. Update the flow
            const updateRes = await fetch(`${API_BASE}/approval-flows/${data.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Updated Test Flow',
                    steps: [
                        { step_name: 'Step A', approver_role: 'staff', order_index: 1 }
                    ]
                })
            });
            console.log("Update Flow result:", await updateRes.json());

            // 3. Delete the flow
            const deleteRes = await fetch(`${API_BASE}/approval-flows/${data.id}`, { method: 'DELETE' });
            console.log("Delete Flow result:", await deleteRes.json());
        }
    } catch (e) {
        console.error("Workflow Flows test failed:", e.message);
    }
}

test();
