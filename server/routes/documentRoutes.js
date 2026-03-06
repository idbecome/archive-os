import express from 'express';
import { upload } from '../config/upload.js';
import {
    getDocuments,
    getDocumentById,
    uploadDocument,
    updateDocument,
    deleteDocument,
    moveDocument,
    copyDocument,
    restoreVersion,
    getComments,
    addComment,
    promoteCommentAttachment,
    streamDocument
} from '../controllers/documentController.js';

import { checkAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(checkAuth);

// List documents (refined query)
router.get('/', getDocuments);

// Upload (New or Revision)
// Using 'file' as the field name, consistent with frontend
router.post('/upload', upload.single('file'), uploadDocument);
router.post('/', upload.single('file'), uploadDocument); // Fix for createDocument

// Document Operations
router.get('/:id', getDocumentById); // Restore missing route
router.put('/:id', upload.single('file'), updateDocument);
router.delete('/:id', deleteDocument);

// Operations supporting both params and body ID
router.post('/:id/move', moveDocument);
router.post('/move', moveDocument);
router.post('/:id/copy', copyDocument);
router.post('/copy', copyDocument);

router.post('/:id/restore', restoreVersion);

// Comment Routes
router.get('/:id/comments', getComments);
router.post('/:id/comments', upload.single('attachment'), addComment);
router.post('/:id/promote-comment-attachment', promoteCommentAttachment);

// Stream Route (Bypass IDM)
router.get('/:id/stream', streamDocument);

export default router;
