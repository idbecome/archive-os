import express from 'express';
import {
    getApprovalFlows,
    createApprovalFlow,
    updateApprovalFlow,
    deleteApprovalFlow,
    getDocumentApprovals,
    initiateApproval,
    updateApproval,
    approveStep,
    resetApprovalStep
} from '../controllers/workflowController.js';

const router = express.Router();

// Flow Definitions
router.get('/flows', getApprovalFlows);
router.post('/flows', createApprovalFlow);
router.put('/flows/:id', updateApprovalFlow);
router.delete('/flows/:id', deleteApprovalFlow);

// Document specific approvals
router.get('/documents/:documentId', getDocumentApprovals);
router.post('/initiate', initiateApproval);
router.put('/:id', updateApproval);
router.post('/:approvalId/action', approveStep);
router.post('/:id/reset-step', resetApprovalStep);

export default router;
