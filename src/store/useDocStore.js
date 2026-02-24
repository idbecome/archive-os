import { create } from 'zustand';
import { documentService as api } from '../services/documentService';
import { handleApiError } from '../utils/errorHelper';

export const useDocStore = create((set, get) => ({
    docList: [],
    folders: [],
    currentFolderId: null,
    folderHistory: [null],
    historyIndex: 0,

    approvals: [],
    flows: [],

    // Setters
    setDocList: (docList) => set({ docList }),
    setFolders: (folders) => set({ folders }),
    setApprovals: (approvals) => set({ approvals }),
    setFlows: (flows) => set({ flows }),
    setCurrentFolderId: (folderId) => set({ currentFolderId: folderId }),

    // Actions
    fetchDocs: async () => {
        const data = await api.getDocs();
        set({ docList: data });
    },
    fetchFolders: async () => {
        const data = await api.getFolders();
        set({ folders: data });
    },
    fetchApprovals: async () => {
        const data = await api.getApprovals();
        set({ approvals: data });
        const flowData = await api.getApprovalFlows();
        set({ flows: flowData });
    },

    navigateFolder: (folderId) => {
        const { folderHistory, historyIndex } = get();
        const newHistory = folderHistory.slice(0, historyIndex + 1);
        newHistory.push(folderId);
        set({
            folderHistory: newHistory,
            historyIndex: newHistory.length - 1,
            currentFolderId: folderId
        });
    },
    navigateBack: () => {
        const { folderHistory, historyIndex } = get();
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            set({
                historyIndex: newIndex,
                currentFolderId: folderHistory[newIndex]
            });
        }
    },
    navigateForward: () => {
        const { folderHistory, historyIndex } = get();
        if (historyIndex < folderHistory.length - 1) {
            const newIndex = historyIndex + 1;
            set({
                historyIndex: newIndex,
                currentFolderId: folderHistory[newIndex]
            });
        }
    },

    // Mutation Actions
    createDocument: async (doc) => {
        const tempId = `temp-${Date.now()}`;
        const newDoc = { ...doc, id: tempId, status: 'uploading' };
        const prev = get().docList;
        set({ docList: [newDoc, ...prev] });
        try {
            const res = await api.createDocument(doc);
            if (res) {
                await get().fetchDocs();
            }
            return res;
        } catch (error) {
            set({ docList: prev });
            const msg = await handleApiError(error);
            console.error("Failed to create document:", msg);
            throw msg;
        }
    },
    updateDocument: async (id, doc) => {
        const prev = get().docList;
        set({ docList: prev.map(d => d.id === id ? { ...d, ...doc } : d) });
        try {
            await api.updateDocument(id, doc);
            await get().fetchDocs();
        } catch (error) {
            set({ docList: prev });
            const msg = await handleApiError(error);
            console.error("Failed to update document:", msg);
            throw msg;
        }
    },
    deleteDocument: async (id) => {
        const prev = get().docList;
        set({ docList: prev.filter(d => d.id !== id) });
        try {
            await api.deleteDocument(id);
            await get().fetchDocs();
        } catch (error) {
            set({ docList: prev });
            const msg = await handleApiError(error);
            console.error("Failed to delete document:", msg);
            throw msg;
        }
    },
    createFolder: async (folder) => {
        const tempId = `temp-${Date.now()}`;
        const newFolder = { ...folder, id: tempId, owner: folder.owner || 'System' };
        const prev = get().folders;
        set({ folders: [...prev, newFolder] });
        try {
            await api.createFolder(folder);
            await get().fetchFolders();
        } catch (error) {
            set({ folders: prev });
            const msg = await handleApiError(error);
            console.error("Failed to create folder:", msg);
            throw msg;
        }
    },
    updateFolder: async (id, data) => {
        const prev = get().folders;
        set({ folders: prev.map(f => f.id === id ? { ...f, ...data } : f) });
        try {
            await api.updateFolder(id, data);
            await get().fetchFolders();
        } catch (error) {
            set({ folders: prev });
            const msg = await handleApiError(error);
            console.error("Failed to update folder:", msg);
            throw msg;
        }
    },
    deleteFolder: async (id) => {
        const prev = get().folders;
        set({ folders: prev.filter(f => f.id !== id) });
        try {
            await api.deleteFolder(id);
            await get().fetchFolders();
        } catch (error) {
            set({ folders: prev });
            const msg = await handleApiError(error);
            console.error("Failed to delete folder:", msg);
            throw msg;
        }
    },
    copyDocument: async (id, targetFolderId, owner) => {
        const res = await api.copyDocument(id, targetFolderId, owner);
        await get().fetchDocs();
        return res;
    },
    moveDocument: async (id, targetFolderId, owner) => {
        const prev = get().docList;
        set({
            docList: prev.map(d => d.id === id ? { ...d, folderId: targetFolderId } : d)
        });
        try {
            const res = await api.moveDocument(id, targetFolderId, owner);
            await get().fetchDocs();
            return res;
        } catch (error) {
            set({ docList: prev });
            const msg = await handleApiError(error);
            console.error("Failed to move document:", msg);
            throw msg;
        }
    },
    restoreDocumentVersion: async (id, versionTimestamp) => {
        const res = await api.restoreDocumentVersion(id, versionTimestamp);
        await get().fetchDocs();
        return res;
    },
    promoteCommentAttachment: async (docId, commentId) => {
        const res = await api.promoteCommentAttachment(docId, commentId);
        await get().fetchDocs();
        return res;
    },
    addComment: async (docId, formData) => {
        // Since formData is often real FormData for file uploads, 
        // optimistic update for attachments is tricky.
        // But we can at least handle text comments.
        const prevDocs = get().docList;
        // If we had a separate comment store, we'd update that.
        // Assuming comments are fetched on demand, we just refresh docs.
        try {
            const res = await api.addComment(docId, formData);
            // Refresh list to show new comment count if applicable
            await get().fetchDocs();
            return res;
        } catch (error) {
            const msg = await handleApiError(error);
            console.error("Failed to add comment:", msg);
            throw msg;
        }
    }
}));
