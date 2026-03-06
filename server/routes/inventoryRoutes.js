import express from 'express';
import {
    getInventory,
    getBoxes,
    createBox,
    updateInventoryItem,
    getAnalytics,
    getExternalInventory,
    createExternalItem,
    deleteExternalItem,
    moveInventoryItem
} from '../controllers/inventoryController.js';

import { checkAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(checkAuth);

// Internal Inventory
router.get('/analytics', getAnalytics); // Place before generic /:id to avoid collision
router.get('/', getInventory);
router.post('/move', moveInventoryItem);
router.put('/:id', updateInventoryItem);

// Boxes
router.get('/boxes', getBoxes);
router.post('/boxes', createBox);

// External Inventory
router.get('/external', getExternalInventory);
router.post('/external', createExternalItem);
router.delete('/external/:id', deleteExternalItem);

export default router;
