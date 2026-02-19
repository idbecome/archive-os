import express from 'express';
import {
    getTaxObjects,
    createTaxObject,
    getTaxAudits,
    createTaxAudit,
    updateAuditStatus,
    getTaxSummaries,
    upsertTaxSummary
} from '../controllers/taxController.js';

const router = express.Router();

// Master Data
router.get('/objects', getTaxObjects);
router.post('/objects', createTaxObject);

// Audits
router.get('/audits', getTaxAudits);
router.post('/audits', createTaxAudit);
router.put('/audits/:id/status', updateAuditStatus);

// Analytics & Summaries
router.get('/summaries', getTaxSummaries);
router.post('/summaries', upsertTaxSummary);

export default router;
