import express from 'express';
import { searchDocuments, chatWithAI, semanticSearch, getJobStatus } from '../controllers/searchController.js';

import { checkAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(checkAuth);

router.get('/documents', searchDocuments);
router.post('/chat', chatWithAI);
router.post('/ai', semanticSearch); // Dashboard Semantic Search
router.get('/job/:id', getJobStatus); // Polling for AI results

export default router;
