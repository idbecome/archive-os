import { create } from 'zustand';

export const useAuthStore = create((set) => ({
    currentUser: (() => {
        try {
            const saved = localStorage.getItem('archive_user');
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    })(),
    users: [],
    roles: [],
    departments: [],

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
}));
