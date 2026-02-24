import { knex } from '../db.js';
import { systemLog } from '../utils/logger.js';

export const getInventory = async (req, res) => {
    try {
        const { search } = req.query;
        let query = knex('inventory').select('*');

        if (search) {
            // Use relational tables for fast indexed search instead of LIKE on JSON
            const matchingInventoryIds = await knex('boxes')
                .leftJoin('ordners', 'ordners.box_ref_id', 'boxes.id')
                .leftJoin('invoices', 'invoices.ordner_ref_id', 'ordners.id')
                .where('boxes.box_id', 'like', `%${search}%`)
                .orWhere('ordners.no_ordner', 'like', `%${search}%`)
                .orWhere('invoices.invoice_no', 'like', `%${search}%`)
                .orWhere('invoices.vendor', 'like', `%${search}%`)
                .select('boxes.inventory_id')
                .groupBy('boxes.inventory_id');

            const relationalIds = matchingInventoryIds.map(r => r.inventory_id).filter(Boolean);

            query = query.where(builder => {
                builder.where('status', 'like', `%${search}%`)
                    .orWhere('id', 'like', `%${search}%`);
                if (relationalIds.length > 0) {
                    builder.orWhereIn('id', relationalIds);
                }
            });
        }

        const rows = await query;
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getBoxes = async (req, res) => {
    try {
        const boxes = await knex('boxes').select('*');
        res.json(boxes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createBox = async (req, res) => {
    try {
        const { box_id, description, location } = req.body;
        const [id] = await knex('boxes').insert({
            box_id,
            description,
            location
        });
        await systemLog('Admin', "Create Box", `Created box: ${box_id}`);
        res.json({ id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, box_data, history, lastUpdated } = req.body;

        const updateData = {
            status,
            lastUpdated: lastUpdated || knex.fn.now()
        };

        if (box_data !== undefined) updateData.box_data = typeof box_data === 'string' ? box_data : JSON.stringify(box_data);
        if (history !== undefined) updateData.history = typeof history === 'string' ? history : JSON.stringify(history);

        const rowsAffected = await knex('inventory').where('id', id).update(updateData);

        if (rowsAffected === 0) {
            return res.status(404).json({ error: `Slot #${id} tidak ditemukan di database.` });
        }

        await systemLog('System', "Update Inventory", `Updated item ID: ${id}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getAnalytics = async (req, res) => {
    try {
        const [totalItems] = await knex('inventory').count('id as count');
        const [totalBoxes] = await knex('boxes').count('id as count');
        const [totalExternal] = await knex('external_items').count('id as count');

        // Mock recent activity for now or fetch from logs
        const recentActivity = await knex('logs').orderBy('timestamp', 'desc').limit(5);

        res.json({
            totalItems: totalItems.count,
            totalBoxes: totalBoxes.count,
            totalExternal: totalExternal.count,
            recentActivity
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getExternalInventory = async (req, res) => {
    try {
        const rows = await knex('external_items').select('*');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createExternalItem = async (req, res) => {
    try {
        const { boxId, destination, sentDate, sender, boxData, history } = req.body;
        const [id] = await knex('external_items').insert({
            boxId,
            destination,
            sentDate: sentDate || knex.fn.now(),
            sender,
            boxData: typeof boxData === 'string' ? boxData : JSON.stringify(boxData || {}),
            history: typeof history === 'string' ? history : JSON.stringify(history || [])
        });
        await systemLog('System', "External Inventory", `Added item: ${boxId} to ${destination}`);
        res.json({ id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const deleteExternalItem = async (req, res) => {
    try {
        const { id } = req.params;
        await knex('external_items').where('id', id).del();
        await systemLog('System', "External Inventory", `Deleted item ID: ${id}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const moveInventoryItem = async (req, res) => {
    try {
        const { sourceId, targetId, user } = req.body;

        if (!sourceId || !targetId) {
            return res.status(400).json({ error: "Source ID and Target ID are required." });
        }

        // 1. Fetch both slots
        const sourceSlot = await knex('inventory').where('id', sourceId).first();
        const targetSlot = await knex('inventory').where('id', targetId).first();

        if (!sourceSlot) return res.status(404).json({ error: `Source slot #${sourceId} not found.` });
        if (!targetSlot) return res.status(404).json({ error: `Target slot #${targetId} not found.` });

        if (sourceSlot.status === 'EMPTY') {
            return res.status(400).json({ error: "Source slot is empty." });
        }

        if (targetSlot.status !== 'EMPTY') {
            return res.status(400).json({ error: `Target slot #${targetId} already occupied.` });
        }

        // 2. Transact the move
        await knex.transaction(async (trx) => {
            // Update target
            const targetHistory = typeof targetSlot.history === 'string' ? JSON.parse(targetSlot.history) : (targetSlot.history || []);
            const sourceBoxData = sourceSlot.box_data; // Keep raw string or object

            await trx('inventory').where('id', targetId).update({
                status: sourceSlot.status,
                box_data: sourceBoxData,
                lastUpdated: knex.fn.now(),
                history: JSON.stringify([
                    ...targetHistory,
                    { action: 'MOVE_IN', details: `Source: #${sourceId}, User: ${user || 'Unknown'}`, timestamp: new Date().toISOString() }
                ])
            });

            // Update source to empty
            const sourceHistory = typeof sourceSlot.history === 'string' ? JSON.parse(sourceSlot.history) : (sourceSlot.history || []);
            await trx('inventory').where('id', sourceId).update({
                status: 'EMPTY',
                box_data: null,
                lastUpdated: knex.fn.now(),
                history: JSON.stringify([
                    ...sourceHistory,
                    { action: 'MOVE_OUT', details: `Target: #${targetId}, User: ${user || 'Unknown'}`, timestamp: new Date().toISOString() }
                ])
            });
        });

        await systemLog(user || 'System', "Move Inventory", `Moved box from #${sourceId} to #${targetId}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
