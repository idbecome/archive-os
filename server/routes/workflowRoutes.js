import express from 'express';
import {
    getApprovalFlows,
    createApprovalFlow,
    getDocumentApprovals,
    initiateApproval,
    approveStep
} from '../controllers/workflowController.js';

const router = express.Router();

// Flow Definitions
router.get('/flows', getApprovalFlows);
router.post('/flows', createApprovalFlow);

// Document specific approvals
router.get('/documents/:documentId', getDocumentApprovals);
router.post('/initiate', initiateApproval);
router.post('/:approvalId/action', approveStep);

export default router;
