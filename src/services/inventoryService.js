import { apiClient, API_URL } from './apiClient';

export const inventoryService = {
    async getInventory() {
        try {
            const data = await apiClient.fetchJson(`${API_URL}/inventory`);
            return data.map(slot => {
                const rawBoxData = slot.boxData || slot.box_data || slot.boxdata;
                const rawHistory = slot.history || slot.history_data;
                const parsedHistory = typeof rawHistory === 'string' ? JSON.parse(rawHistory) : (rawHistory || []);
                return {
                    ...slot,
                    id: Number(slot.id),
                    status: (slot.status || 'EMPTY').toUpperCase(),
                    boxData: typeof rawBoxData === 'string' ? JSON.parse(rawBoxData) : (rawBoxData || null),
                    history: Array.isArray(parsedHistory) ? parsedHistory : []
                };
            });
        } catch (e) {
            console.error("inventoryService Error (getInventory):", e);
            return [];
        }
    },

    async updateInventory(id, data) {
        const payload = { ...data };
        if (payload.boxData !== undefined) {
            payload.box_data = JSON.stringify(payload.boxData);
            payload.boxData = null;
        }
        return await apiClient.fetchJson(`${API_URL}/inventory/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    },

    async moveInventory(sourceId, targetId, user) {
        return await apiClient.fetchJson(`${API_URL}/inventory/move`, {
            method: 'POST',
            body: JSON.stringify({ sourceId, targetId, user })
        });
    },

    async getExternalItems() {
        try {
            return await apiClient.fetchJson(`${API_URL}/inventory/external`);
        } catch (e) {
            console.error("inventoryService Error (getExternalItems):", e);
            return [];
        }
    },

    async createExternalItem(item) {
        return await apiClient.fetchJson(`${API_URL}/inventory/external`, {
            method: 'POST',
            body: JSON.stringify(item)
        });
    },

    async deleteExternalItem(id) {
        return await apiClient.fetchRaw(`${API_URL}/inventory/external/${id}`, { method: 'DELETE' });
    }
};
