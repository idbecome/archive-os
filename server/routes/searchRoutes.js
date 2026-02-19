import express from 'express';
import { searchDocuments, chatWithAI, semanticSearch } from '../controllers/searchController.js';

const router = express.Router();

router.get('/documents', searchDocuments);
router.post('/chat', chatWithAI);
router.post('/ai', semanticSearch); // Dashboard Semantic Search

export default router;
