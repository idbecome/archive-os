import { create } from 'zustand';

export const useAppStore = create((set) => ({
    // Theme & Layout
    isDarkMode: (() => {
        const saved = localStorage.getItem('archive_theme');
        return saved ? saved === 'dark' : true;
    })(),
    showInitialLanding: (() => !localStorage.getItem('archive_landing_seen'))(),
    isSidebarCollapsed: false,
    activeTab: 'dashboard',

    // Modals
    isModalOpen: false,
    modalTab: 'details',

    // Misc UI Data
    copyNotification: null,
    logs: [],

    // Setters
    setIsDarkMode: (val) => {
        localStorage.setItem('archive_theme', val ? 'dark' : 'light');
        set({ isDarkMode: val });
    },
    setShowInitialLanding: (val) => {
        if (!val) localStorage.setItem('archive_landing_seen', 'true');
        set({ showInitialLanding: val });
    },
    setIsSidebarCollapsed: (val) => set({ isSidebarCollapsed: val }),
    setActiveTab: (val) => set({ activeTab: val }),
    setIsModalOpen: (val) => set({ isModalOpen: val }),
    setModalTab: (val) => set({ modalTab: val }),
    setCopyNotification: (val) => set({ copyNotification: val }),
    setLogs: (logs) => set({ logs }),
}));
