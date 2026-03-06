import express from 'express';
import {
    getLogs,
    createLog,
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getFolders,
    getFolderById,
    createFolder,
    updateFolder,
    deleteFolder,
    moveFolder,
    copyFolder
} from '../controllers/systemController.js';
import { checkAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(checkAuth);

router.get('/logs', getLogs);
router.post('/logs', createLog);
router.get('/roles', getRoles);
router.post('/roles', createRole);
router.put('/roles/:id', updateRole);
router.delete('/roles/:id', deleteRole);

router.get('/departments', getDepartments);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);
router.get('/folders', getFolders);
router.get('/folders/:id', getFolderById);
router.post('/folders', createFolder);
router.put('/folders/:id', updateFolder);
router.delete('/folders/:id', deleteFolder);
router.post('/folders/move', moveFolder);
router.post('/folders/copy', copyFolder);

export default router;
