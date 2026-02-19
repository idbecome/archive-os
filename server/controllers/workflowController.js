import { knex } from '../db.js';
import { systemLog } from '../utils/logger.js';

export const getApprovalFlows = async (req, res) => {
    try {
        const flows = await knex('approval_flows').select('*');
        res.json(flows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createApprovalFlow = async (req, res) => {
    try {
        const { name, description, steps } = req.body;
        // steps is array of { step_name, approver_role, order_index }

        const [flowId] = await knex('approval_flows').insert({
            name,
            description
        });

        if (steps && steps.length > 0) {
            const inserts = steps.map(s => ({
                flow_id: flowId,
                step_name: s.step_name,
                approver_role: s.approver_role,
                order_index: s.order_index
            }));
            await knex('approval_steps').insert(inserts);
        }

        await systemLog('Admin', "Create Workflow", `Created workflow: ${name}`);
        res.json({ id: flowId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};


export const getDocumentApprovals = async (req, res) => {
    try {
        const { documentId } = req.params;
        const approvals = await knex('document_approvals')
            .where('document_id', documentId)
            .orderBy('created_at', 'desc');
        res.json(approvals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const initiateApproval = async (req, res) => {
    try {
        // Handle payload from DocumentApproval.jsx
        const {
            title, description, division,
            requester_name, requester_username,
            attachment_url, attachment_name,
            steps, flow_id
        } = req.body;

        // Validation
        if (!title || !requester_username || !steps || steps.length === 0) {
            return res.status(400).json({ error: "Missing required fields (title, requester, steps)" });
        }

        // Insert into document_approvals
        const [approvalId] = await knex('document_approvals').insert({
            title,
            description,
            division,
            requester_name,
            requester_username,
            attachment_url,
            attachment_name,
            flow_id: flow_id || null, // Optional link to template
            status: 'Pending',
            current_step_index: 0,
            created_at: knex.fn.now()
        });

        // Insert instance steps into approval_steps
        // Note: approval_steps is used for both templates (flow_id) and instances (approval_id)
        // Here we insert for the instance (approval_id)
        const stepInserts = steps.map((s, idx) => ({
            approval_id: approvalId,
            step_index: idx,
            approver_username: s.username,
            approver_name: s.name,
            status: 'Pending',
            note: ''
        }));

        await knex('approval_steps').insert(stepInserts);

        await systemLog(requester_username, "Initiate Approval", `Started approval: ${title} (ID: ${approvalId})`);
        res.json({ success: true, id: approvalId });
    } catch (e) {
        console.error("Initiate Approval Error:", e);
        res.status(500).json({ error: e.message });
    }
};

export const approveStep = async (req, res) => {
    try {
        const { approvalId } = req.params;
        const { username, action, note, file } = req.body; // action: 'Approve' | 'Reject'

        const approval = await knex('document_approvals').where('id', approvalId).first();
        if (!approval) return res.status(404).json({ error: "Approval not found" });

        const currentIdx = approval.current_step_index;

        // Get all steps for this approval instance
        const steps = await knex('approval_steps')
            .where('approval_id', approvalId)
            .orderBy('step_index', 'asc');

        const currentStep = steps[currentIdx];

        if (!currentStep) return res.status(400).json({ error: "Invalid step state" });

        // Verify approver (optional strict check, frontend does it too)
        if (currentStep.approver_username !== username) {
            // Allow admin override or check permissions if needed
            // for now, trust the payload or check generic admin role if implemented
        }

        if (action === 'Reject') {
            // Update step status
            await knex('approval_steps').where('id', currentStep.id).update({
                status: 'Rejected',
                action_date: knex.fn.now(),
                note: note
            });

            // Update approval status
            await knex('document_approvals').where('id', approvalId).update({
                status: 'Rejected',
                current_step_index: currentIdx // Stays at this step or resets? Usually ends here.
            });

            await systemLog(username, "Reject Approval", `Rejected approval ID: ${approvalId} at step ${currentStep.step_index + 1}`);
            return res.json({ status: 'Rejected' });
        }

        // Handle Approve
        await knex('approval_steps').where('id', currentStep.id).update({
            status: 'Approved',
            action_date: knex.fn.now(),
            note: note
        });

        // Check if there is a next step
        const nextIdx = currentIdx + 1;
        if (nextIdx < steps.length) {
            // Move to next step
            await knex('document_approvals').where('id', approvalId).update({
                current_step_index: nextIdx,
                status: 'Pending' // Still pending overall
            });
            res.json({ status: 'Pending', next_step: nextIdx });
        } else {
            // All steps done -> Final Approval
            await knex('document_approvals').where('id', approvalId).update({
                status: 'Approved',
                current_step_index: nextIdx // Indicates completion
            });
            await systemLog(username, "Approve Workflow", `Final approval for ID: ${approvalId}`);
            res.json({ status: 'Approved' });
        }

    } catch (e) {
        console.error("Approve Step Error:", e);
        res.status(500).json({ error: e.message });
    }
};

export const getAllApprovals = async (req, res) => {
    try {
        const approvals = await knex('document_approvals')
            .select('*')
            .orderBy('created_at', 'desc');

        // Hydrate with steps
        // Efficient way: fetch all steps for these approvals
        const approvalIds = approvals.map(a => a.id);
        const steps = await knex('approval_steps')
            .whereIn('approval_id', approvalIds)
            .orderBy('step_index', 'asc');

        // Group steps by approval_id
        const stepsMap = {};
        steps.forEach(s => {
            if (!stepsMap[s.approval_id]) stepsMap[s.approval_id] = [];
            stepsMap[s.approval_id].push(s);
        });

        // Attach steps to approvals
        const result = approvals.map(a => ({
            ...a,
            steps: stepsMap[a.id] || []
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteApproval = async (req, res) => {
    try {
        const { approvalId } = req.params;

        // Deleting approval steps first
        await knex('approval_steps').where('approval_id', approvalId).del();

        const deleted = await knex('document_approvals').where('id', approvalId).del();

        if (!deleted) {
            return res.status(404).json({ error: "Approval not found" });
        }

        await systemLog('Admin', "Delete Approval", `Deleted approval ID: ${approvalId}`);
        res.json({ success: true });
    } catch (e) {
        console.error("Delete Approval Error:", e);
        res.status(500).json({ error: e.message });
    }
};
