import express from 'express';
import {
    getTaxAudits,
    createTaxAudit,
    getTaxSummaries,
    upsertTaxSummary
} from '../controllers/taxController.js';
import {
    getApprovalFlows,
    createApprovalFlow,

    initiateApproval,
    getAllApprovals,
    approveStep,
    deleteApproval
} from '../controllers/workflowController.js';
import { upload } from '../config/upload.js';

const router = express.Router();

// Tax Aliases
router.get('/tax-audits', getTaxAudits);
router.post('/tax-audits', createTaxAudit);
router.get('/tax-summaries', getTaxSummaries);
router.post('/tax-summaries', upsertTaxSummary);

// Workflow Aliases
router.get('/approval-flows', getApprovalFlows);
router.post('/approval-flows', createApprovalFlow);
router.get('/approvals', getAllApprovals);
router.post('/approvals', initiateApproval);
router.post('/approvals/:approvalId/action', upload.single('file'), approveStep);
router.delete('/approvals/:approvalId', deleteApproval);


export default router;

