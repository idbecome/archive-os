// Gunakan URL absolut jika di lingkungan development (Vite port 3000)
// Gunakan relative path jika di production (Docker/Nginx)
const getApiUrl = () => {
    const { hostname, port, protocol } = window.location;
    // Jika port adalah port Vite (5173/3000), arahkan ke backend port 5000
    if (port === '5173' || port === '3000' || hostname === 'localhost') {
        return `${protocol}//${hostname}:5000/api`;
    }
    return '/api';
};
const API_URL = getApiUrl();

export const db = {
    async getInventory() {
        try {
            const response = await fetch(`${API_URL}/inventory`);
            if (!response.ok) throw new Error('Gagal mengambil data');
            const data = await response.json();

            return data.map(slot => {
                const rawBoxData = slot.boxData || slot.box_data || slot.boxdata;
                const rawHistory = slot.history || slot.history_data; // Defensive

                const parsedHistory = typeof rawHistory === 'string' ? JSON.parse(rawHistory) : (rawHistory || []);

                return {
                    ...slot,
                    id: Number(slot.id),
                    status: (slot.status || 'EMPTY').toUpperCase(),
                    boxData: typeof rawBoxData === 'string' ? JSON.parse(rawBoxData) : (rawBoxData || null),
                    history: Array.isArray(parsedHistory) ? parsedHistory : []
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
            return data.map(doc => {
                const rawVersions = doc.versionsHistory || doc.versions_history;
                return {
                    ...doc,
                    fileData: doc.fileData || doc.file_data || doc.filedata,
                    versionsHistory: typeof rawVersions === 'string' ? JSON.parse(rawVersions) : (rawVersions || [])
                };
            });
        } catch { return []; }
    },

    async getDocuments(params = {}) {
        try {
            const query = new URLSearchParams(params).toString();
            const response = await fetch(`${API_URL}/documents?${query}`);
            if (!response.ok) throw new Error('Gagal mengambil dokumen');
            const data = await response.json();
            return data.map(doc => {
                const rawVersions = doc.versionsHistory || doc.versions_history;
                return {
                    ...doc,
                    fileData: doc.fileData || doc.file_data || doc.filedata,
                    versionsHistory: typeof rawVersions === 'string' ? JSON.parse(rawVersions) : (rawVersions || [])
                };
            });
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
            const rawVersions = doc.versionsHistory || doc.versions_history;
            return {
                ...doc,
                fileData: doc.fileData || doc.file_data || doc.filedata,
                versionsHistory: typeof rawVersions === 'string' ? JSON.parse(rawVersions) : (rawVersions || [])
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

    async createTaxAudit(data) {
        try {
            const response = await fetch(`${API_URL}/tax-audits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Gagal membuat audit');
            return await response.json();
        } catch (e) { console.error("Gagal membuat tax audit", e); throw e; }
    },

    async updateTaxAudit(id, data) {
        try {
            const response = await fetch(`${API_URL}/tax-audits/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Gagal update audit');
        } catch (e) { console.error("Gagal update tax audit", e); throw e; }
    },

    async deleteTaxAudit(id) {
        try {
            const response = await fetch(`${API_URL}/tax-audits/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Gagal hapus audit');
        } catch (e) { console.error("Gagal hapus tax audit", e); throw e; }
    },

    async getTaxSummaries() {
        try {
            const response = await fetch(`${API_URL}/tax-summaries`);
            if (!response.ok) throw new Error('Gagal mengambil data pajak');
            const data = await response.json();
            // Backend sudah melakukan parsing JSON di server/index.js, 
            // tapi kita pastikan id tetap string untuk konsistensi frontend
            return data.map(item => ({ ...item, id: String(item.id) }));
        } catch (error) {
            console.error("DB Error (TaxSummaries):", error);
            return JSON.parse(localStorage.getItem('tax_summaries') || '[]');
        }
    },
    async login(username, password) {
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            return data;
        } catch (e) {
            console.error("Login error:", e);
            throw e;
        }
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
            const isUpdate = !!data.id;
            const url = isUpdate ? `${API_URL}/tax-summaries/${data.id}` : `${API_URL}/tax-summaries`;
            const response = await fetch(url, {
                method: isUpdate ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Gagal menyimpan ke server');
            return await response.json();
        } catch (e) { console.error("Gagal menyimpan tax summary", e); throw e; }
    },

    async deleteTaxSummary(id) {
        try {
            const response = await fetch(`${API_URL}/tax-summaries/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Gagal menghapus data di server');
        } catch (e) { console.error("Gagal hapus tax summary", e); throw e; }
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
            let body = doc;
            if (!(doc instanceof FormData)) {
                const formData = new FormData();
                Object.keys(doc).forEach(key => {
                    if (key === 'file' && doc[key] instanceof File) {
                        formData.append('file', doc[key]);
                    } else if (doc[key] !== null && doc[key] !== undefined) {
                        formData.append(key, doc[key]);
                    }
                });
                body = formData;
            }

            const response = await fetch(`${API_URL}/documents`, {
                method: 'POST',
                body: body
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
            let body = doc;
            if (!(doc instanceof FormData)) {
                const formData = new FormData();
                Object.keys(doc).forEach(key => {
                    if (key === 'file' && doc[key] instanceof File) {
                        formData.append('file', doc[key]);
                    } else if (doc[key] !== null && doc[key] !== undefined) {
                        formData.append(key, doc[key]);
                    }
                });
                body = formData;
            }

            await fetch(`${API_URL}/documents/${id}`, {
                method: 'PUT',
                body: body
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

    async moveInventory(sourceId, targetId, user) {
        try {
            const response = await fetch(`${API_URL}/inventory/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceId, targetId, user })
            });

            const text = await response.text();
            let data = null;
            try {
                data = text ? JSON.parse(text) : null;
            } catch (e) {
                console.error("Gagal parse JSON respons:", text);
            }

            if (!response.ok) {
                const errorMsg = data?.error || (text && text.length < 100 ? text : `Server Error ${response.status}`);
                throw new Error(errorMsg);
            }
            return data;
        } catch (e) { throw e; }
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
    },

    async restoreDocumentVersion(id, versionTimestamp) {
        try {
            const response = await fetch(`${API_URL}/documents/${id}/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ versionTimestamp })
            });
            if (!response.ok) throw new Error('Gagal restore versi');
            return await response.json();
        } catch (e) {
            console.error("restoreDocumentVersion Error:", e);
            throw e;
        }
    },

    async copyDocument(id, targetFolderId) {
        try {
            const response = await fetch(`${API_URL}/documents/copy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, targetFolderId })
            });
            if (!response.ok) throw new Error('Gagal menyalin dokumen');
            return await response.json();
        } catch (e) {
            console.error("copyDocument Error:", e);
            throw e;
        }
    },

    async moveDocument(id, targetFolderId) {
        try {
            const response = await fetch(`${API_URL}/documents/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, targetFolderId })
            });
            if (!response.ok) throw new Error('Gagal memindahkan dokumen');
            return await response.json();
        } catch (e) {
            console.error("moveDocument Error:", e);
            throw e;
        }
    },

    async copyFolder(id, targetParentId) {
        try {
            const response = await fetch(`${API_URL}/folders/copy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, targetParentId })
            });
            if (!response.ok) throw new Error('Gagal menyalin folder');
            return await response.json();
        } catch (e) {
            console.error("copyFolder Error:", e);
            throw e;
        }
    },

    async moveFolder(id, targetParentId) {
        try {
            const response = await fetch(`${API_URL}/folders/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, targetParentId })
            });
            if (!response.ok) throw new Error('Gagal memindahkan folder');
            return await response.json();
        } catch (e) {
            console.error("moveFolder Error:", e);
            throw e;
        }
    },

    async getComments(docId) {
        try {
            const response = await fetch(`${API_URL}/documents/${docId}/comments`);
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch { return []; }
    },

    async addComment(docId, formData) {
        try {
            const response = await fetch(`${API_URL}/documents/${docId}/comments`, {
                method: 'POST',
                body: formData
            });
            return await response.json();
        } catch (e) { console.error(e); return { success: false }; }
    },

    async promoteCommentAttachment(docId, commentId) {
        try {
            const response = await fetch(`${API_URL}/documents/${docId}/promote-comment-attachment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commentId })
            });
            return await response.json();
        } catch (e) { console.error(e); return { success: false }; }
    },

    async getAuditNotes(auditId, stepIndex) {
        try {
            const response = await fetch(`${API_URL}/tax-audits/${auditId}/steps/${stepIndex}/notes`);
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch { return []; }
    },

    async addAuditNote(auditId, stepIndex, formData) {
        try {
            const response = await fetch(`${API_URL}/tax-audits/${auditId}/steps/${stepIndex}/notes`, {
                method: 'POST',
                body: formData
            });
            return await response.json();
        } catch (e) { console.error(e); return { success: false }; }
    },

    // --- DOCUMENT APPROVALS ---
    async getApprovals() {
        try {
            const response = await fetch(`${API_URL}/approvals`);
            if (!response.ok) return [];
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch { return []; }
    },

    async createApproval(data) {
        try {
            const response = await fetch(`${API_URL}/approvals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (e) { console.error(e); return { success: false }; }
    },

    async updateApproval(id, data) {
        try {
            const response = await fetch(`${API_URL}/approvals/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (e) { console.error(e); return { success: false }; }
    },

    async submitApprovalAction(id, data) {
        try {
            const isFormData = data instanceof FormData;
            const response = await fetch(`${API_URL}/approvals/${id}/action`, {
                method: 'POST',
                headers: isFormData ? {} : { 'Content-Type': 'application/json' },
                body: isFormData ? data : JSON.stringify(data)
            });
            return await response.json();
        } catch (e) { console.error(e); return { success: false }; }
    },

    async resetApprovalStep(id, stepIndex) {
        try {
            const response = await fetch(`${API_URL}/approvals/${id}/reset-step`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stepIndex })
            });
            return await response.json();
        } catch (e) { console.error(e); return { success: false }; }
    },

    async deleteApproval(id) {
        try {
            await fetch(`${API_URL}/approvals/${id}`, { method: 'DELETE' });
        } catch (e) { console.error(e); }
    },

    // --- APPROVAL FLOWS (MASTER) ---
    async getApprovalFlows() {
        try {
            const response = await fetch(`${API_URL}/approval-flows`);
            if (!response.ok) return [];
            return await response.json();
        } catch { return []; }
    },

    async createApprovalFlow(data) {
        try {
            const response = await fetch(`${API_URL}/approval-flows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (e) { console.error(e); return { success: false }; }
    },

    async updateApprovalFlow(id, data) {
        try {
            const response = await fetch(`${API_URL}/approval-flows/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (e) { console.error(e); return { success: false }; }
    },

    async deleteApprovalFlow(id) {
        try {
            await fetch(`${API_URL}/approval-flows/${id}`, { method: 'DELETE' });
        } catch (e) { console.error(e); }
    },

    // --- PUSTAKA ---
    async getPustakaGuides() {
        try {
            const response = await fetch(`${API_URL}/pustaka/guides`);
            if (!response.ok) return [];
            return await response.json();
        } catch { return []; }
    },

    async getGuideSlides(guideId) {
        try {
            const response = await fetch(`${API_URL}/pustaka/guides/${guideId}/slides`);
            if (!response.ok) return [];
            return await response.json();
        } catch { return []; }
    },

    async createPustakaGuide(data) {
        try {
            const response = await fetch(`${API_URL}/pustaka/guides`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (e) { console.error(e); return { success: false }; }
    },

    async createPustakaSlide(data) {
        try {
            const response = await fetch(`${API_URL}/pustaka/slides`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (e) { console.error(e); return { success: false }; }
    },

    async updatePustakaGuide(id, data) {
        try {
            const response = await fetch(`${API_URL}/pustaka/guides/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (e) { console.error(e); return { success: false }; }
    },

    async deletePustakaGuide(id) {
        try {
            const response = await fetch(`${API_URL}/pustaka/guides/${id}`, { method: 'DELETE' });
            return await response.json();
        } catch (e) { console.error(e); return { success: false }; }
    },

    async deleteSlidesByGuideId(guideId) {
        try {
            const response = await fetch(`${API_URL}/pustaka/slides/by-guide/${guideId}`, { method: 'DELETE' });
            return await response.json();
        } catch (e) { console.error(e); return { success: false }; }
    },

    async getPustakaCategories() {
        try {
            const response = await fetch(`${API_URL}/pustaka/categories`);
            if (!response.ok) return [];
            return await response.json();
        } catch { return []; }
    },

    async searchPustaka(query) {
        try {
            const response = await fetch(`${API_URL}/pustaka/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) return [];
            return await response.json();
        } catch { return []; }
    },

    async createPustakaCategory(name) {
        try {
            const response = await fetch(`${API_URL}/pustaka/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            return await response.json();
        } catch (e) { console.error(e); return { success: false }; }
    },

    // --- NORMALIZED QUERY ENDPOINTS ---
    async getInvoices(params = {}) {
        try {
            const query = new URLSearchParams(params).toString();
            const response = await fetch(`${API_URL}/invoices?${query}`);
            if (!response.ok) throw new Error('Gagal mengambil data invoice');
            return await response.json();
        } catch (e) {
            console.error("getInvoices Error:", e);
            return [];
        }
    },

    async getInvoiceStats() {
        try {
            const response = await fetch(`${API_URL}/stats/invoices`);
            if (!response.ok) throw new Error('Gagal mengambil statistik invoice');
            return await response.json();
        } catch (e) {
            console.error("getInvoiceStats Error:", e);
            return { total_invoices: 0, total_boxes: 0, total_ordners: 0, top_vendors: [], by_period: [] };
        }
    }
};
