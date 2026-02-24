import { create } from 'zustand';
import { authService as api } from '../services/authService';
import { handleApiError } from '../utils/errorHelper';

export const useUserStore = create((set, get) => ({
    users: [],
    roles: [],
    departments: [],
    logs: [],
    isLoading: false,

    fetchUsers: async () => {
        const data = await api.getUsers();
        set({ users: data || [] });
    },
    fetchRoles: async () => {
        const data = await api.getRoles();
        set({ roles: data || [] });
    },
    fetchDepartments: async () => {
        const data = await api.getDepartments();
        set({ departments: data || [] });
    },
    fetchLogs: async () => {
        const data = await api.getLogs();
        set({ logs: data || [] });
    },

    // User Actions
    saveUser: async (id, userData) => {
        const prev = get().users;
        const isUpdate = !!id;
        if (isUpdate) {
            set({ users: prev.map(u => u.id === id ? { ...u, ...userData } : u) });
        } else {
            const tempId = `temp-${Date.now()}`;
            set({ users: [{ ...userData, id: tempId }, ...prev] });
        }

        try {
            if (isUpdate) {
                await api.updateUser(id, userData);
            } else {
                await api.createUser(userData);
            }
            await get().fetchUsers();
        } catch (error) {
            set({ users: prev });
            const msg = await handleApiError(error);
            console.error("Failed to save user:", msg);
            throw msg;
        }
    },

    deleteUser: async (id) => {
        const prev = get().users;
        set({ users: prev.filter(u => u.id !== id) });
        try {
            await api.deleteUser(id);
            await get().fetchUsers();
        } catch (error) {
            set({ users: prev });
            const msg = await handleApiError(error);
            console.error("Failed to delete user:", msg);
            throw msg;
        }
    },

    // Role Actions
    saveRole: async (id, roleData) => {
        const prev = get().roles;
        const isUpdate = !!id;
        if (isUpdate) {
            set({ roles: prev.map(r => r.id === id ? { ...r, ...roleData } : r) });
        } else {
            const tempId = `temp-${Date.now()}`;
            set({ roles: [{ ...roleData, id: tempId }, ...prev] });
        }

        try {
            if (isUpdate) {
                await api.updateRole(id, roleData);
            } else {
                await api.createRole(roleData);
            }
            await get().fetchRoles();
        } catch (error) {
            set({ roles: prev });
            const msg = await handleApiError(error);
            console.error("Failed to save role:", msg);
            throw msg;
        }
    },

    deleteRole: async (id) => {
        const prev = get().roles;
        set({ roles: prev.filter(r => r.id !== id) });
        try {
            await api.deleteRole(id);
            await get().fetchRoles();
        } catch (error) {
            set({ roles: prev });
            const msg = await handleApiError(error);
            console.error("Failed to delete role:", msg);
            throw msg;
        }
    },

    // Department Actions
    saveDepartment: async (id, name) => {
        const prev = get().departments;
        const isUpdate = !!id;
        if (isUpdate) {
            set({ departments: prev.map(d => d.id === id ? { ...d, name } : d) });
        } else {
            const tempId = `temp-${Date.now()}`;
            set({ departments: [{ id: tempId, name }, ...prev] });
        }

        try {
            if (isUpdate) {
                await api.updateDepartment(id, name);
            } else {
                await api.createDepartment(name);
            }
            await get().fetchDepartments();
        } catch (error) {
            set({ departments: prev });
            const msg = await handleApiError(error);
            console.error("Failed to save department:", msg);
            throw msg;
        }
    },

    deleteDepartment: async (id) => {
        const prev = get().departments;
        set({ departments: prev.filter(d => d.id !== id) });
        try {
            await api.deleteDepartment(id);
            await get().fetchDepartments();
        } catch (error) {
            set({ departments: prev });
            const msg = await handleApiError(error);
            console.error("Failed to delete department:", msg);
            throw msg;
        }
    }
}));
