import { knex } from '../db.js';

// --- LOGS ---
export const getLogs = async (req, res) => {
    try {
        const logs = await knex('logs').orderBy('timestamp', 'desc').limit(100);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createLog = async (req, res) => {
    try {
        const { user, action, details, oldValue, newValue } = req.body;
        await knex('logs').insert({
            user: user || 'System',
            action,
            details,
            oldValue,
            newValue,
            timestamp: knex.fn.now()
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- ROLES ---
export const getRoles = async (req, res) => {
    try {
        const roles = await knex('roles').select('*');
        res.json(roles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- DEPARTMENTS ---
export const getDepartments = async (req, res) => {
    try {
        const depts = await knex('departments').select('*');
        res.json(depts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- FOLDERS ---
export const getFolders = async (req, res) => {
    try {
        const folders = await knex('folders').select('*');
        res.json(folders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getFolderById = async (req, res) => {
    try {
        const { id } = req.params;
        const folder = await knex('folders').where('id', id).first();
        if (!folder) return res.status(404).json({ error: "Folder not found" });
        res.json(folder);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createFolder = async (req, res) => {
    try {
        const { name, parentId, privacy, allowedDepts, allowedUsers, owner } = req.body;
        const [id] = await knex('folders').insert({
            name,
            parentId: parentId || null,
            privacy: privacy || 'public',
            allowedDepts: JSON.stringify(allowedDepts || []),
            allowedUsers: JSON.stringify(allowedUsers || []),
            owner: owner || 'System',
            createdAt: knex.fn.now()
        });
        res.json({ id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateFolder = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, parentId, privacy, allowedDepts, allowedUsers } = req.body;
        await knex('folders').where('id', id).update({
            name,
            parentId: parentId || null,
            privacy,
            allowedDepts: allowedDepts ? JSON.stringify(allowedDepts) : undefined,
            allowedUsers: allowedUsers ? JSON.stringify(allowedUsers) : undefined
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteFolder = async (req, res) => {
    try {
        const { id } = req.params;
        await knex('folders').where('id', id).del();
        // Optionally handle recursive delete or move children to root
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const moveFolder = async (req, res) => {
    try {
        const { id, targetParentId } = req.body;
        await knex('folders').where('id', id).update({
            parentId: targetParentId || null
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const copyFolder = async (req, res) => {
    try {
        const { id, targetParentId } = req.body;
        const folder = await knex('folders').where('id', id).first();
        if (!folder) return res.status(404).json({ error: "Source folder not found" });

        const [newId] = await knex('folders').insert({
            ...folder,
            id: undefined, // Let DB generate new ID
            name: `Copy of ${folder.name}`,
            parentId: targetParentId || null,
            createdAt: knex.fn.now()
        });
        res.json({ success: true, id: newId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
