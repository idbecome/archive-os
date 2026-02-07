const API_URL = 'http://localhost:5000/api';

export const db = {
    async getInventory() {
        try {
            const response = await fetch(`${API_URL}/inventory`);
            if (!response.ok) throw new Error('Gagal mengambil data');
            const data = await response.json();

            return data.map(slot => {
                const rawBoxData = slot.boxData || slot.box_data || slot.boxdata;
                const rawHistory = slot.history || slot.history_data; // Defensive

                return {
                    ...slot,
                    id: Number(slot.id),
                    status: (slot.status || 'EMPTY').toUpperCase(),
                    boxData: typeof rawBoxData === 'string' ? JSON.parse(rawBoxData) : (rawBoxData || null),
                    history: typeof rawHistory === 'string' ? JSON.parse(rawHistory) : (rawHistory || [])
                };
            });
        } catch (error) {
            console.error("DB Error (Inventory):", error);
            return [];
        }
    },

    async saveInventory(data) {
        try {
            await fetch(`${API_URL}/inventory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) { console.error("Gagal menyimpan inventory", e); }
    },

    async getLogs() {
        try {
            const response = await fetch(`${API_URL}/logs`);
            return await response.json();
        } catch { return []; }
    },

    async saveLogs(data) {
        try {
            const latestLog = data[0];
            await fetch(`${API_URL}/logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(latestLog)
            });
        } catch (e) { console.error("Gagal menyimpan logs", e); }
    },

    async getDocs() {
        try {
            const response = await fetch(`${API_URL}/documents`);
            const data = await response.json();
            return data.map(doc => ({
                ...doc,
                fileData: doc.fileData || doc.file_data || doc.filedata,
                versionsHistory: doc.versions_history || []
            }));
        } catch { return []; }
    },

    async getDocuments(params = {}) {
        try {
            const query = new URLSearchParams(params).toString();
            const response = await fetch(`${API_URL}/documents?${query}`);
            if (!response.ok) throw new Error('Gagal mengambil dokumen');
            const data = await response.json();
            return data.map(doc => ({
                ...doc,
                fileData: doc.fileData || doc.file_data || doc.filedata,
                versionsHistory: doc.versions_history || []
            }));
        } catch (e) {
            console.error("DB Error (Documents):", e);
            return [];
        }
    },

    // NEW: Ambil detail dokumen (termasuk fileData) jika di list kosong
    async getDocumentById(id) {
        try {
            const response = await fetch(`${API_URL}/documents/${id}`);
            if (!response.ok) throw new Error('Gagal mengambil detail dokumen');
            const doc = await response.json();
            return {
                ...doc,
                fileData: doc.fileData || doc.file_data || doc.filedata
            };
        } catch (e) { console.error(e); return null; }
    },

    async saveDocs(data) {
        try {
            await fetch(`${API_URL}/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) { console.error("Gagal menyimpan dokumen", e); }

    },

    async getFolders() {
        try {
            const response = await fetch(`${API_URL}/folders`);
            return await response.json();
        } catch { return []; }
    },

    async createFolder(folder) {
        try {
            await fetch(`${API_URL}/folders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(folder)
            });
        } catch (e) { console.error("Gagal membuat folder", e); }
    },

    async updateFolder(id, data) {
        try {
            await fetch(`${API_URL}/folders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) { console.error("Gagal update folder", e); }
    },

    async deleteFolder(id) {
        try {
            await fetch(`${API_URL}/folders/${id}`, { method: 'DELETE' });
        } catch (e) { console.error("Gagal hapus folder", e); }
    },

    async getTaxAudits() {
        try {
            const response = await fetch(`${API_URL}/tax-audits`);
            return await response.json();
        } catch { return []; }
    },
    async getTaxSummaries() {
        return JSON.parse(localStorage.getItem('tax_summaries') || '[]');
    },
    async getUsers() {
        try {
            const response = await fetch(`${API_URL}/users`);
            return await response.json();
        } catch { return []; }
    },
    async getRoles() {
        try {
            const response = await fetch(`${API_URL}/roles`);
            return await response.json();
        } catch { return []; }
    },
    async getDepartments() {
        try {
            const response = await fetch(`${API_URL}/departments`);
            return await response.json();
        } catch { return []; }
    },

    async createUser(data) {
        try {
            await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) { console.error("Gagal membuat user", e); }
    },

    async updateUser(id, data) {
        try {
            await fetch(`${API_URL}/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) { console.error("Gagal update user", e); }
    },

    async deleteUser(id) {
        try {
            await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
        } catch (e) { console.error("Gagal hapus user", e); }
    },

    async createRole(data) {
        try {
            await fetch(`${API_URL}/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) { console.error("Gagal membuat role", e); }
    },

    async updateRole(id, data) {
        try {
            await fetch(`${API_URL}/roles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) { console.error("Gagal update role", e); }
    },

    async deleteRole(id) {
        try {
            await fetch(`${API_URL}/roles/${id}`, { method: 'DELETE' });
        } catch (e) { console.error("Gagal hapus role", e); }
    },

    async saveTaxSummary(data) {
        try {
            await fetch(`${API_URL}/tax-summaries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) { console.error("Gagal menyimpan tax summary", e); }
    },

    async createDepartment(name) {
        try {
            await fetch(`${API_URL}/departments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
        } catch (e) { console.error("Gagal membuat dept", e); }
    },

    async deleteDepartment(id) {
        try {
            await fetch(`${API_URL}/departments/${id}`, { method: 'DELETE' });
        } catch (e) { console.error("Gagal hapus dept", e); }
    },
    async updateDepartment(id, name) {
        try {
            await fetch(`${API_URL}/departments/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
        } catch (e) { console.error("Gagal update dept", e); }
    },

    // --- MISSING FUNCTIONS ADDED ---

    async createDocument(doc) {
        try {
            const response = await fetch(`${API_URL}/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(doc)
            });
            if (!response.ok) throw new Error('Gagal buat dokumen');
            return await response.json();
        } catch (e) {
            console.error("createDocument Error:", e);
            return null;
        }
    },

    async updateDocument(id, doc) {
        try {
            await fetch(`${API_URL}/documents/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(doc)
            });
        } catch (e) { console.error("Gagal update dokumen", e); }
    },

    async deleteDocument(id) {
        try {
            await fetch(`${API_URL}/documents/${id}`, { method: 'DELETE' });
        } catch (e) { console.error("Gagal hapus dokumen", e); }
    },

    async createLog(log) {
        try {
            await fetch(`${API_URL}/logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(log)
            });
        } catch (e) { console.error("Gagal buat log", e); }
    },

    async updateInventory(id, data) {
        // FIX: Mapping ke box_data (LONGTEXT) untuk menghindari limitasi TEXT (64KB) pada kolom boxData
        // Hal ini mencegah data hilang/corrupt saat menyimpan file attachment (Base64)
        const payload = { ...data };
        if (payload.boxData !== undefined) {
            payload.box_data = JSON.stringify(payload.boxData);
            payload.boxData = null; // Kosongkan kolom legacy agar tidak truncate
        }

        try {
            await fetch(`${API_URL}/inventory/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) { console.error("Gagal update inventory", e); }
    },

    async createExternalItem(item) {
        try {
            await fetch(`${API_URL}/inventory/external`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
        } catch (e) { console.error("Gagal buat external item", e); }
    },

    async getExternalItems() {
        try {
            const response = await fetch(`${API_URL}/inventory/external`);
            return await response.json();
        } catch { return []; }
    },

    async deleteExternalItem(id) {
        try {
            await fetch(`${API_URL}/inventory/external/${id}`, { method: 'DELETE' });
        } catch (e) { console.error("Gagal hapus external item", e); }
    },

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) throw new Error('Upload failed');
            return await response.json();
        } catch (e) {
            console.error("Upload error:", e);
            throw e;
        }
    }
};
