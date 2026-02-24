import { create } from 'zustand';
import { inventoryService as api } from '../services/inventoryService';
import { handleApiError } from '../utils/errorHelper';
import { TOTAL_SLOTS } from '../utils/constants';

export const useInventoryStore = create((set, get) => ({
    inventory: [],
    inventoryIssues: [],
    stats: { stored: 0, borrowed: 0, audit: 0, empty: 0, occupancy: 0 },
    externalItems: [],
    activeInvTab: 'internal', // 'internal' | 'external'
    ocrStats: { counts: { active: 0, waiting: 0, completed: 0, failed: 0 }, activeJobs: [] },

    setInventory: (inventory) => set({ inventory }),
    setInventoryIssues: (inventoryIssues) => set({ inventoryIssues }),
    setStats: (stats) => set({ stats }),
    setExternalItems: (externalItems) => set({ externalItems }),
    setActiveInvTab: (tab) => set({ activeInvTab: tab }),
    setOcrStats: (ocrStats) => set({ ocrStats }),

    fetchInventory: async () => {
        try {
            const data = await api.getInventory();
            const extData = await api.getExternalItems();

            const emptyCount = data.filter(s => (s.status || 'EMPTY').toUpperCase() === 'EMPTY').length;
            const borrowedCount = data.filter(s => (s.status || '').toUpperCase() === 'BORROWED').length;
            const auditCount = data.filter(s => (s.status || '').toUpperCase() === 'AUDIT').length;
            const storedCount = data.filter(s => (s.status || '').toUpperCase() === 'STORED').length;
            const occupancyRate = (data.filter(s => s.status && s.status.toUpperCase() !== 'EMPTY').length / TOTAL_SLOTS) * 100;

            const issues = [];
            const boxIdMap = {};
            data.forEach(slot => {
                const status = (slot.status || 'EMPTY').toUpperCase();
                const boxId = slot.boxData?.id;

                if (status !== 'EMPTY' && !boxId) {
                    issues.push({
                        type: 'CORRUPT',
                        slotId: slot.id,
                        message: `Slot #${slot.id} (${status}) memiliki data yang rusak atau terpotong.`
                    });
                }

                if (boxId) {
                    if (boxIdMap[boxId]) {
                        issues.push({
                            type: 'DUPLICATE',
                            boxId: boxId,
                            slots: [boxIdMap[boxId], slot.id],
                            message: `Box "${boxId}" terdeteksi ganda di Slot #${boxIdMap[boxId]} dan Slot #${slot.id}.`
                        });
                    }
                    boxIdMap[boxId] = slot.id;
                }
            });

            set({
                inventory: data,
                externalItems: extData,
                inventoryIssues: issues,
                stats: {
                    stored: storedCount,
                    borrowed: borrowedCount,
                    audit: auditCount,
                    empty: emptyCount,
                    occupancy: occupancyRate
                }
            });
        } catch (error) {
            console.error("Failed to fetch inventory", error);
        }
    },

    // Mutation Actions
    updateInventory: async (id, data) => {
        const prev = get().inventory;
        set({
            inventory: prev.map(item => item.id === id ? { ...item, ...data } : item)
        });
        try {
            await api.updateInventory(id, data);
            await get().fetchInventory();
        } catch (error) {
            set({ inventory: prev });
            const msg = await handleApiError(error);
            console.error("Failed to update inventory:", msg);
            throw msg;
        }
    },
    moveInventory: async (sourceId, targetId, user) => {
        const prev = get().inventory;
        const sourceSlot = prev.find(s => s.id === sourceId);
        const targetSlot = prev.find(s => s.id === targetId);

        if (!sourceSlot || !targetSlot) return;

        // Optimistic Swap/Move
        const newInventory = prev.map(s => {
            if (s.id === sourceId) return { ...s, status: 'EMPTY', boxData: null };
            if (s.id === targetId) return { ...s, status: sourceSlot.status, boxData: sourceSlot.boxData };
            return s;
        });

        set({ inventory: newInventory });

        try {
            const res = await api.moveInventory(sourceId, targetId, user);
            await get().fetchInventory();
            return res;
        } catch (error) {
            set({ inventory: prev });
            const msg = await handleApiError(error);
            console.error("Failed to move inventory:", msg);
            throw msg;
        }
    },
    createExternalItem: async (item) => {
        const prev = get().externalItems;
        const tempId = `temp-${Date.now()}`;
        const newItem = { ...item, id: tempId };
        set({ externalItems: [newItem, ...prev] });
        try {
            await api.createExternalItem(item);
            await get().fetchInventory();
        } catch (error) {
            set({ externalItems: prev });
            const msg = await handleApiError(error);
            console.error("Failed to create external item:", msg);
            throw msg;
        }
    },
    deleteExternalItem: async (id) => {
        const prev = get().externalItems;
        set({ externalItems: prev.filter(item => item.id !== id) });
        try {
            await api.deleteExternalItem(id);
            await get().fetchInventory();
        } catch (error) {
            set({ externalItems: prev });
            const msg = await handleApiError(error);
            console.error("Failed to delete external item:", msg);
            throw msg;
        }
    }
}));
