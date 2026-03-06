import express from 'express';
import {
    login,
    logout,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    getProfile,
    updateProfile
} from '../controllers/authController.js';
import { checkAuth } from '../middleware/auth.js';

const router = express.Router();

// Auth
router.post('/login', login);
router.post('/logout', logout);

// User Management (Admin)
router.get('/users', checkAuth, getUsers);
router.post('/users', checkAuth, createUser);
router.put('/users/:id', checkAuth, updateUser);
router.delete('/users/:id', checkAuth, deleteUser);

// User Profile (Self)
router.get('/users/profile/:id', checkAuth, getProfile);
router.put('/users/profile/:id', checkAuth, updateProfile);

export default router;
