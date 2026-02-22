import { create } from 'zustand';
import { db as api } from '../services/database';

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
    }
}));
