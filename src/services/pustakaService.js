import { apiClient, API_URL } from './apiClient';

export const pustakaService = {
    async getPustakaGuides() {
        try {
            return await apiClient.fetchJson(`${API_URL}/pustaka/guides`);
        } catch (e) {
            console.error("pustakaService Error (getPustakaGuides):", e);
            return [];
        }
    },

    async getGuideSlides(guideId) {
        try {
            return await apiClient.fetchJson(`${API_URL}/pustaka/guides/${guideId}/slides`);
        } catch (e) {
            console.error("pustakaService Error (getGuideSlides):", e);
            return [];
        }
    },

    async createPustakaGuide(data) {
        return await apiClient.fetchJson(`${API_URL}/pustaka/guides`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async createPustakaSlide(data) {
        return await apiClient.fetchJson(`${API_URL}/pustaka/slides`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updatePustakaGuide(id, data) {
        return await apiClient.fetchJson(`${API_URL}/pustaka/guides/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deletePustakaGuide(id) {
        return await apiClient.fetchJson(`${API_URL}/pustaka/guides/${id}`, { method: 'DELETE' });
    },

    async deleteSlidesByGuideId(guideId) {
        return await apiClient.fetchJson(`${API_URL}/pustaka/slides/by-guide/${guideId}`, { method: 'DELETE' });
    },

    async getPustakaCategories() {
        try {
            return await apiClient.fetchJson(`${API_URL}/pustaka/categories`);
        } catch (e) {
            console.error("pustakaService Error (getPustakaCategories):", e);
            return [];
        }
    },

    async createPustakaCategory(name) {
        return await apiClient.fetchJson(`${API_URL}/pustaka/categories`, {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    },

    async searchPustaka(query) {
        try {
            return await apiClient.fetchJson(`${API_URL}/pustaka/search?q=${encodeURIComponent(query)}`);
        } catch (e) {
            console.error("pustakaService Error (searchPustaka):", e);
            return [];
        }
    }
};
