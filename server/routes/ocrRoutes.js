import express from 'express';
import {
    getOCRStatus,
    getOCRQueue,
    retryOCRJob,
    clearCompletedJobs
} from '../controllers/ocrController.js';

const router = express.Router();

router.get('/status', getOCRStatus);
router.get('/queue', getOCRQueue);
router.post('/retry/:id', retryOCRJob);
router.delete('/completed', clearCompletedJobs);

export default router;
