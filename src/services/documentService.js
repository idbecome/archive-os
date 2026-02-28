import { API_URL } from './database';

export const documentService = {
    async getDocuments(params) {
        const token = localStorage.getItem('archive_token');
        const query = new URLSearchParams(params).toString();
        const res = await fetch(`${API_URL}/documents?${query}`, {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (!res.ok) throw new Error('Gagal mengambil dokumen');
        return res.json();
    },
    async getDocumentById(id) {
        const token = localStorage.getItem('archive_token');
        const res = await fetch(`${API_URL}/documents/${id}`, {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (!res.ok) throw new Error('Gagal mengambil detail dokumen');
        return res.json();
    },
    async createDocument(payload) {
        const token = localStorage.getItem('archive_token');
        const formData = new FormData();
        Object.keys(payload).forEach(key => {
            if (key === 'file' && payload[key]) formData.append('file', payload[key]);
            else formData.append(key, payload[key]);
        });
        const res = await fetch(`${API_URL}/documents`, { 
            method: 'POST', 
            headers: { 'Authorization': token ? `Bearer ${token}` : '' },
            body: formData 
        });
        if (!res.ok) throw new Error('Gagal membuat dokumen');
        return res.json();
    },
    async updateDocument(id, payload) {
        const token = localStorage.getItem('archive_token');
        const formData = new FormData();
        Object.keys(payload).forEach(key => {
            if (key === 'file' && payload[key]) formData.append('file', payload[key]);
            else formData.append(key, payload[key]);
        });
        const res = await fetch(`${API_URL}/documents/${id}`, { 
            method: 'PUT', 
            headers: { 'Authorization': token ? `Bearer ${token}` : '' },
            body: formData 
        });
        if (!res.ok) throw new Error('Gagal memperbarui dokumen');
        return res.json();
    },
    async deleteDocument(id) {
        const token = localStorage.getItem('archive_token');
        const res = await fetch(`${API_URL}/documents/${id}`, { 
            method: 'DELETE',
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (!res.ok) throw new Error('Gagal menghapus dokumen');
        return res.json();
    },
    async getFolders() {
        const token = localStorage.getItem('archive_token');
        const res = await fetch(`${API_URL}/folders`, {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (!res.ok) throw new Error('Gagal mengambil folder');
        return res.json();
    },
    async createFolder(payload) {
        const token = localStorage.getItem('archive_token');
        const res = await fetch(`${API_URL}/folders`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Gagal membuat folder');
        return res.json();
    },
    async updateFolder(id, payload) {
        const token = localStorage.getItem('archive_token');
        const res = await fetch(`${API_URL}/folders/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Gagal memperbarui folder');
        return res.json();
    },
    async deleteFolder(id) {
        const token = localStorage.getItem('archive_token');
        const res = await fetch(`${API_URL}/folders/${id}`, { 
            method: 'DELETE',
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (!res.ok) throw new Error('Gagal menghapus folder');
        return res.json();
    }
};