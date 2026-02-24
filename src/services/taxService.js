import { apiClient, API_URL } from './apiClient';

export const taxService = {
    async getTaxSummaries() {
        try {
            const data = await apiClient.fetchJson(`${API_URL}/tax-summaries`);
            return data.map(item => ({
                ...item,
                id: String(item.id),
                data: typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || {})
            }));
        } catch (e) {
            console.error("taxService Error (getTaxSummaries):", e);
            return [];
        }
    },

    async saveTaxSummary(data) {
        const isUpdate = !!data.id;
        const url = isUpdate ? `${API_URL}/tax-summaries/${data.id}` : `${API_URL}/tax-summaries`;
        return await apiClient.fetchJson(url, {
            method: isUpdate ? 'PUT' : 'POST',
            body: JSON.stringify(data)
        });
    },

    async deleteTaxSummary(id) {
        return await apiClient.fetchRaw(`${API_URL}/tax-summaries/${id}`, { method: 'DELETE' });
    },

    async getTaxAudits() {
        try {
            return await apiClient.fetchJson(`${API_URL}/tax-audits`);
        } catch (e) {
            console.error("taxService Error (getTaxAudits):", e);
            return [];
        }
    },

    async createTaxAudit(data) {
        return await apiClient.fetchJson(`${API_URL}/tax-audits`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateTaxAudit(id, data) {
        return await apiClient.fetchJson(`${API_URL}/tax-audits/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteTaxAudit(id) {
        return await apiClient.fetchRaw(`${API_URL}/tax-audits/${id}`, { method: 'DELETE' });
    },

    async getAuditNotes(auditId, stepIndex) {
        try {
            return await apiClient.fetchJson(`${API_URL}/tax-audits/${auditId}/steps/${stepIndex}/notes`);
        } catch (e) {
            console.error("taxService Error (getAuditNotes):", e);
            return [];
        }
    },

    async addAuditNote(auditId, stepIndex, formData) {
        return await apiClient.upload(`${API_URL}/tax-audits/${auditId}/steps/${stepIndex}/notes`, formData);
    }
};
