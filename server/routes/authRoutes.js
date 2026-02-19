import express from 'express';
import {
    login,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    getProfile,
    updateProfile
} from '../controllers/authController.js';

const router = express.Router();

// Auth
router.post('/login', login);

// User Management (Admin)
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// User Profile (Self)
router.get('/users/profile/:id', getProfile);
router.put('/users/profile/:id', updateProfile);

export default router;
