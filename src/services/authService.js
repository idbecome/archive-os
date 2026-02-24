import { apiClient, API_URL } from './apiClient';

export const authService = {
    async login(username, password) {
        return await apiClient.fetchJson(`${API_URL}/login`, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },

    async getUsers() {
        try {
            return await apiClient.fetchJson(`${API_URL}/users`);
        } catch (e) {
            console.error("authService Error (getUsers):", e);
            return [];
        }
    },

    async createUser(data) {
        return await apiClient.fetchJson(`${API_URL}/users`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateUser(id, data) {
        return await apiClient.fetchJson(`${API_URL}/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteUser(id) {
        return await apiClient.fetchRaw(`${API_URL}/users/${id}`, { method: 'DELETE' });
    },

    async getRoles() {
        try {
            return await apiClient.fetchJson(`${API_URL}/roles`);
        } catch (e) {
            console.error("authService Error (getRoles):", e);
            return [];
        }
    },

    async createRole(data) {
        return await apiClient.fetchJson(`${API_URL}/roles`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateRole(id, data) {
        return await apiClient.fetchJson(`${API_URL}/roles/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteRole(id) {
        return await apiClient.fetchRaw(`${API_URL}/roles/${id}`, { method: 'DELETE' });
    },

    async getDepartments() {
        try {
            return await apiClient.fetchJson(`${API_URL}/departments`);
        } catch (e) {
            console.error("authService Error (getDepartments):", e);
            return [];
        }
    },

    async createDepartment(name) {
        return await apiClient.fetchJson(`${API_URL}/departments`, {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    },

    async updateDepartment(id, name) {
        return await apiClient.fetchJson(`${API_URL}/departments/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name })
        });
    },

    async deleteDepartment(id) {
        return await apiClient.fetchRaw(`${API_URL}/departments/${id}`, { method: 'DELETE' });
    },

    async getLogs(page = 1, limit = 15, search = '') {
        try {
            const url = `${API_URL}/logs?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
            return await apiClient.fetchJson(url);
        } catch (e) {
            console.error("authService Error (getLogs):", e);
            return { data: [], pagination: { totalItems: 0, totalPages: 0, currentPage: 1, limit: 15 } };
        }
    },

    async createLog(data) {
        return await apiClient.fetchJson(`${API_URL}/logs`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};
