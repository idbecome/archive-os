import express from 'express';
import {
    getTaxObjects,
    createTaxObject,
    getTaxAudits,
    createTaxAudit,
    updateAuditStatus,
    getTaxSummaries,
    upsertTaxSummary,
    getTaxWp,
    createTaxWp,
    updateTaxWp,
    deleteTaxWp,
    deleteAllTaxWp,
    deleteTaxAudit,
    updateTaxAudit,
    getAuditNotes,
    addAuditNote,
    deleteTaxSummary
} from '../controllers/taxController.js';
import { upload } from '../config/upload.js';

const router = express.Router();

// Master Data
router.get('/objects', getTaxObjects);
router.post('/objects', createTaxObject);

// Audits
router.get('/audits', getTaxAudits);
router.post('/audits', createTaxAudit);
router.put('/audits/:id/status', updateAuditStatus);
router.put('/audits/:id', updateTaxAudit);
router.delete('/audits/:id', deleteTaxAudit);

// Audit Notes
router.get('/audits/:id/steps/:stepIndex/notes', getAuditNotes);
router.post('/audits/:id/steps/:stepIndex/notes', upload.single('attachment'), addAuditNote);

// Analytics & Summaries
router.get('/summaries', getTaxSummaries);
router.post('/summaries', upsertTaxSummary);
router.put('/summaries/:id', upsertTaxSummary);
router.delete('/summaries/:id', deleteTaxSummary);

// Database WP
router.get('/wp', getTaxWp);
router.post('/wp', createTaxWp);
router.put('/wp/:id', updateTaxWp);
router.delete('/wp/:id', deleteTaxWp);
router.delete('/wp-all', deleteAllTaxWp);

export default router;
