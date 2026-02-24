import { create } from 'zustand';
import { authService as api } from '../services/authService';

export const useAuthStore = create((set) => ({
    currentUser: (() => {
        try {
            const saved = localStorage.getItem('archive_user');
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    })(),
    setCurrentUser: (user) => {
        if (user) {
            localStorage.setItem('archive_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('archive_user');
        }
        set({ currentUser: user });
    }
}));
