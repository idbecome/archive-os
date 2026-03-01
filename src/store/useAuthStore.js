import { useAppStore } from './useAppStore';
import { useDocStore } from './useDocStore';
import { useInventoryStore } from './useInventoryStore';
import { usePustakaStore } from './usePustakaStore';
import { useTaxStore } from './useTaxStore';
import { useUserStore } from './useUserStore';

const initialState = {
    currentUser: (() => {
        try {
            const saved = localStorage.getItem('archive_user');
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    })(),
    users: [],
    roles: [],
    departments: [],
};

export const useAuthStore = create((set) => ({
    ...initialState,

    setCurrentUser: (user) => {
        if (user) {
            localStorage.setItem('archive_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('archive_user');
        }
        set({ currentUser: user });
    },
    setUsers: (users) => set({ users }),
    setRoles: (roles) => set({ roles }),
    setDepartments: (departments) => set({ departments }),

    reset: () => set({
        ...initialState,
        currentUser: null // Explicitly clear on reset
    }),

    logout: () => {
        // 1. Clear LocalStorage
        localStorage.removeItem('archive_user');
        localStorage.removeItem('archive_token');

        // 2. Reset all other stores
        useAppStore.getState().reset();
        useDocStore.getState().reset();
        useInventoryStore.getState().reset();
        usePustakaStore.getState().reset();
        useTaxStore.getState().reset();
        useUserStore.getState().reset();

        // 3. Reset self
        set({
            ...initialState,
            currentUser: null
        });
    }
}));
