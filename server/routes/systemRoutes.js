import express from 'express';
import {
    getLogs,
    createLog,
    getRoles,
    getDepartments,
    getFolders,
    getFolderById,
    createFolder,
    updateFolder,
    deleteFolder,
    moveFolder,
    copyFolder
} from '../controllers/systemController.js';

const router = express.Router();

router.get('/logs', getLogs);
router.post('/logs', createLog);
router.get('/roles', getRoles);
router.get('/departments', getDepartments);
router.get('/folders', getFolders);
router.get('/folders/:id', getFolderById);
router.post('/folders', createFolder);
router.put('/folders/:id', updateFolder);
router.delete('/folders/:id', deleteFolder);
router.post('/folders/move', moveFolder);
router.post('/folders/copy', copyFolder);

export default router;
