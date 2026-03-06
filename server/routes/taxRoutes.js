import express from 'express';
import {
    getTaxObjects,
    createTaxObject,
    updateTaxObject,
    deleteTaxObject,
    getTaxAudits,
    createTaxAudit,
    updateAuditStatus,
    getTaxSummaries,
    compareTaxSummaries,
    getOverUnderHistory,
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
    deleteTaxSummary,
    importTaxObjects,
    importTaxWp
} from '../controllers/taxController.js';
import { upload } from '../config/upload.js';

import { checkAuth } from '../middleware/auth.js';

const router = express.Router();

// In tests we mount routes directly without auth; skip auth middleware when running under NODE_ENV=test
if (process.env.NODE_ENV !== 'test') {
    router.use(checkAuth);
}

// Master Data
router.get('/objects', getTaxObjects);
router.post('/objects', createTaxObject);
router.put('/objects/:id', updateTaxObject);
router.delete('/objects/:id', deleteTaxObject);

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
router.get('/compare', compareTaxSummaries);
router.get('/overunder', getOverUnderHistory);
router.post('/summaries', upsertTaxSummary);
router.put('/summaries/:id', upsertTaxSummary);
router.delete('/summaries/:id', deleteTaxSummary);

// Database WP
router.get('/wp', getTaxWp);
router.post('/wp', createTaxWp);
router.put('/wp/:id', updateTaxWp);
router.delete('/wp/:id', deleteTaxWp);
router.delete('/wp-all', deleteAllTaxWp);
router.post('/objects/import', upload.single('file'), importTaxObjects);
router.post('/wp/import', upload.single('file'), importTaxWp);

export default router;
