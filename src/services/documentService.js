import { API_URL } from './database';
import { apiClient } from './apiClient';

export const documentService = {
    async getDocuments(params) {
        const query = new URLSearchParams(params).toString();
        return apiClient.fetchJson(`${API_URL}/documents?${query}`);
    },
    async getDocumentById(id) {
        return apiClient.fetchJson(`${API_URL}/documents/${id}`);
    },
    async createDocument(payload) {
        const formData = new FormData();
        Object.keys(payload).forEach(key => {
            if (key === 'file' && payload[key]) formData.append('file', payload[key]);
            else formData.append(key, payload[key]);
        });
        return apiClient.upload(`${API_URL}/documents`, formData);
    },
    async updateDocument(id, payload) {
        const formData = new FormData();
        Object.keys(payload).forEach(key => {
            if (key === 'file' && payload[key]) formData.append('file', payload[key]);
            else formData.append(key, payload[key]);
        });
        // Use manually for PUT with FormData as apiClient.upload is POST
        const response = await fetch(`${API_URL}/documents/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': localStorage.getItem('archive_token') ? `Bearer ${localStorage.getItem('archive_token')}` : ''
            },
            body: formData
        });
        return response.json();
    },
    async deleteDocument(id) {
        return apiClient.fetchJson(`${API_URL}/documents/${id}`, { method: 'DELETE' });
    },
    async getFolders() {
        return apiClient.fetchJson(`${API_URL}/folders`);
    },
    async createFolder(payload) {
        return apiClient.fetchJson(`${API_URL}/folders`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },
    async updateFolder(id, payload) {
        return apiClient.fetchJson(`${API_URL}/folders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    },
    async deleteFolder(id) {
        return apiClient.fetchJson(`${API_URL}/folders/${id}`, { method: 'DELETE' });
    }
};