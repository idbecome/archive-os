
import { knex } from './server/db.js';

async function createFlow() {
    try {
        console.log("Creating test flow with steps...");

        // Insert flow
        const [flowId] = await knex('approval_flows').insert({
            name: 'Debug Flow',
            description: 'Flow for debugging 500 error',
            steps: JSON.stringify([{ step_name: 'Manager', approver_role: 'manager', order_index: 1 }])
        });

        console.log(`Created Flow ID: ${flowId}`);

        // Insert steps (this is what the controller expects)
        await knex('approval_steps').insert([
            {
                flow_id: flowId,
                step_name: 'Manager Approval',
                approver_role: 'manager',
                order_index: 1
            },
            {
                flow_id: flowId,
                step_name: 'Director Approval',
                approver_role: 'director',
                order_index: 2
            }
        ]);

        console.log("Created approval steps.");
        process.exit(0);
    } catch (err) {
        console.error("Failed to create flow:", err);
        process.exit(1);
    }
}

createFlow();
