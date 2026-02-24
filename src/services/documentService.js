import { apiClient, API_URL } from './apiClient';

export const documentService = {
    async getDocs(params) {
        try {
            const query = params ? '?' + new URLSearchParams(params).toString() : '';
            const data = await apiClient.fetchJson(`${API_URL}/documents${query}`);
            return data.map(doc => {
                const rawVersions = doc.versionsHistory || doc.versions_history;
                return {
                    ...doc,
                    fileData: doc.fileData || doc.file_data || doc.filedata,
                    versionsHistory: typeof rawVersions === 'string' ? JSON.parse(rawVersions) : (rawVersions || [])
                };
            });
        } catch (e) {
            console.error("documentService Error (getDocs):", e);
            return [];
        }
    },

    async getDocumentById(id) {
        try {
            const doc = await apiClient.fetchJson(`${API_URL}/documents/${id}`);
            const rawVersions = doc.versionsHistory || doc.versions_history;
            return {
                ...doc,
                fileData: doc.fileData || doc.file_data || doc.filedata,
                versionsHistory: typeof rawVersions === 'string' ? JSON.parse(rawVersions) : (rawVersions || [])
            };
        } catch (e) {
            console.error("documentService Error (getDocumentById):", e);
            return null;
        }
    },

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
            return await apiClient.upload(`${API_URL}/documents`, body);
        } catch (e) {
            console.error("documentService Error (createDocument):", e);
            throw e;
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
            const response = await fetch(`${API_URL}/documents/${id}`, {
                method: 'PUT',
                body: body
            });
            if (!response.ok) throw response;
            return await response.json();
        } catch (e) {
            console.error("documentService Error (updateDocument):", e);
            throw e;
        }
    },

    async deleteDocument(id) {
        if (!id) throw new Error("ID dokumen tidak valid");
        const response = await apiClient.fetchRaw(`${API_URL}/documents/${id}`, { method: 'DELETE' });
        return response;
    },

    async getFolders() {
        try {
            return await apiClient.fetchJson(`${API_URL}/folders`);
        } catch (e) {
            console.error("documentService Error (getFolders):", e);
            return [];
        }
    },

    async createFolder(folder) {
        return await apiClient.fetchJson(`${API_URL}/folders`, {
            method: 'POST',
            body: JSON.stringify(folder)
        });
    },

    async updateFolder(id, data) {
        return await apiClient.fetchJson(`${API_URL}/folders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteFolder(id) {
        return await apiClient.fetchRaw(`${API_URL}/folders/${id}`, { method: 'DELETE' });
    },

    async moveFolder(folderId, targetFolderId) {
        return await apiClient.fetchJson(`${API_URL}/folders/move`, {
            method: 'POST',
            body: JSON.stringify({ folderId, targetFolderId })
        });
    },

    async copyFolder(id, targetParentId) {
        return await apiClient.fetchJson(`${API_URL}/folders/copy`, {
            method: 'POST',
            body: JSON.stringify({ id, targetParentId })
        });
    },

    async restoreDocumentVersion(id, versionTimestamp) {
        const username = localStorage.getItem('archive_user')
            ? JSON.parse(localStorage.getItem('archive_user')).username
            : 'System';
        return await apiClient.fetchJson(`${API_URL}/documents/${id}/restore`, {
            method: 'POST',
            body: JSON.stringify({ timestamp: versionTimestamp, user: username })
        });
    },

    async copyDocument(id, targetFolderId, owner) {
        return await apiClient.fetchJson(`${API_URL}/documents/copy`, {
            method: 'POST',
            body: JSON.stringify({ id, targetFolderId, owner })
        });
    },

    async moveDocument(id, targetFolderId, owner) {
        return await apiClient.fetchJson(`${API_URL}/documents/move`, {
            method: 'POST',
            body: JSON.stringify({ id, targetFolderId, owner })
        });
    },

    async getApprovals() {
        try {
            return await apiClient.fetchJson(`${API_URL}/approvals`);
        } catch (e) {
            console.error("documentService Error (getApprovals):", e);
            return [];
        }
    },

    async createApproval(data) {
        return await apiClient.fetchJson(`${API_URL}/approvals`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateApproval(id, data) {
        return await apiClient.fetchJson(`${API_URL}/approvals/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async submitApprovalAction(id, data) {
        const isFormData = data instanceof FormData;
        return await apiClient.fetchJson(`${API_URL}/approvals/${id}/action`, {
            method: 'POST',
            headers: isFormData ? {} : { 'Content-Type': 'application/json' },
            body: isFormData ? data : JSON.stringify(data)
        });
    },

    async resetApprovalStep(id, stepIndex) {
        return await apiClient.fetchJson(`${API_URL}/approvals/${id}/reset-step`, {
            method: 'POST',
            body: JSON.stringify({ stepIndex })
        });
    },

    async deleteApproval(id) {
        return await apiClient.fetchRaw(`${API_URL}/approvals/${id}`, { method: 'DELETE' });
    },

    async getApprovalFlows() {
        try {
            const data = await apiClient.fetchJson(`${API_URL}/approval-flows`);
            return data.map(flow => ({
                ...flow,
                steps: typeof flow.steps === 'string' ? JSON.parse(flow.steps) : (flow.steps || []),
                visual_config: typeof flow.visual_config === 'string' ? JSON.parse(flow.visual_config) : (flow.visual_config || null)
            }));
        } catch (e) {
            console.error("documentService Error (getApprovalFlows):", e);
            return [];
        }
    },

    async getComments(docId) {
        try {
            return await apiClient.fetchJson(`${API_URL}/documents/${docId}/comments`);
        } catch (e) {
            console.error("documentService Error (getComments):", e);
            return [];
        }
    },

    async addComment(docId, formData) {
        return await apiClient.upload(`${API_URL}/documents/${docId}/comments`, formData);
    },

    async promoteCommentAttachment(docId, commentId) {
        return await apiClient.fetchJson(`${API_URL}/documents/${docId}/promote-comment-attachment`, {
            method: 'POST',
            body: JSON.stringify({ commentId })
        });
    }
};
