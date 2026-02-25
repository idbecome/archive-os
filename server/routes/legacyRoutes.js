import express from 'express';
import {
    getTaxAudits,
    createTaxAudit,
    getTaxSummaries,
    upsertTaxSummary,
    deleteTaxAudit,
    updateTaxAudit,
    getAuditNotes,
    addAuditNote,
    deleteTaxSummary
} from '../controllers/taxController.js';
import {
    getApprovalFlows,
    createApprovalFlow,

    initiateApproval,
    getAllApprovals,
    approveStep,
    deleteApproval,
    updateApproval,
    deleteApprovalFlow,
    updateApprovalFlow,
    resetApprovalStep
} from '../controllers/workflowController.js';
import { checkAuth } from '../middleware/auth.js';
import { upload } from '../config/upload.js';

const router = express.Router();

router.use(checkAuth);

// Tax Aliases
router.get('/tax-audits', getTaxAudits);
router.post('/tax-audits', createTaxAudit);
router.put('/tax-audits/:id', updateTaxAudit);
router.delete('/tax-audits/:id', deleteTaxAudit);

// Audit Notes Aliases
router.get('/tax-audits/:id/steps/:stepIndex/notes', getAuditNotes);
router.post('/tax-audits/:id/steps/:stepIndex/notes', upload.single('attachment'), addAuditNote);
router.get('/tax-summaries', getTaxSummaries);
router.post('/tax-summaries', upsertTaxSummary);
router.put('/tax-summaries/:id', upsertTaxSummary);
router.delete('/tax-summaries/:id', deleteTaxSummary);

// Workflow Aliases
router.get('/approval-flows', getApprovalFlows);
router.post('/approval-flows', createApprovalFlow);
router.put('/approval-flows/:id', updateApprovalFlow);
router.delete('/approval-flows/:id', deleteApprovalFlow);
router.get('/approvals', getAllApprovals);
router.post('/approvals', initiateApproval);
router.put('/approvals/:id', updateApproval);
router.post('/approvals/:approvalId/action', upload.single('file'), approveStep);
router.post('/approvals/:id/reset-step', resetApprovalStep);
router.delete('/approvals/:approvalId', deleteApproval);


export default router;

