import { knex } from '../db.js';
import bcrypt from 'bcrypt';
import { systemLog } from '../utils/logger.js';

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await knex('users').where('username', username).first();

        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        let match = false;
        if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
            match = await bcrypt.compare(password, user.password);
        } else {
            match = (user.password === password);
            if (match) {
                try {
                    const hashedPassword = await bcrypt.hash(password, 10);
                    await knex('users').where('id', user.id).update({ password: hashedPassword });
                    console.log(`[Auth] Auto-migrated password for user: ${user.username}`);
                } catch (hashErr) {
                    console.error("[Auth] Auto-hash migration error:", hashErr);
                }
            }
        }

        if (match) {
            // Generate or refresh token
            const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
            await knex('users').where('id', user.id).update({ token });

            const { password: _, ...userWithoutPass } = user;
            userWithoutPass.token = token; // Ensure token is in response

            await systemLog(user.username, "Login", "User logged in");
            res.json(userWithoutPass);
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getUsers = async (req, res) => {
    try {
        const rows = await knex('users').select('id', 'username', 'name', 'role', 'department');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createUser = async (req, res) => {
    try {
        const { username, password, name, role, department } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const [id] = await knex('users').insert({
            username,
            password: hashedPassword,
            name,
            role,
            department
        });
        await systemLog('Admin', "Create User", `Created user: ${username}`);
        res.json({ id });
    } catch (e) {
        console.error("CRITICAL: createUser failed:", e);
        res.status(500).json({ error: e.message });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, name, role, department } = req.body;
        const updateData = { username, name, role, department };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        await knex('users').where('id', id).update(updateData);
        await systemLog('Admin', "Update User", `Updated user ID: ${id}`);
        res.json({ success: true });
    } catch (e) {
        console.error("CRITICAL: updateUser failed:", e);
        res.status(500).json({ error: e.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        await knex('users').where('id', req.params.id).del();
        await systemLog('Admin', "Delete User", `Deleted user ID: ${req.params.id}`);
        res.json({ success: true });
    } catch (e) {
        console.error("CRITICAL: deleteUser failed:", e);
        res.status(500).json({ error: e.message });
    }
};

export const getProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await knex('users').where('id', id).first();
        if (!user) return res.status(404).json({ error: "User not found" });

        const { password, ...userWithoutPass } = user;
        res.json(userWithoutPass);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, password, currentPassword } = req.body;

        const user = await knex('users').where('id', id).first();
        if (!user) return res.status(404).json({ error: "User not found" });

        // Verify current password if changing password
        if (password) {
            if (!currentPassword) return res.status(400).json({ error: "Current password required" });
            const match = await bcrypt.compare(currentPassword, user.password);
            if (!match) return res.status(401).json({ error: "Incorrect current password" });
        }

        const updateData = { name };
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        await knex('users').where('id', id).update(updateData);
        await systemLog(user.username, "Profile Update", "User updated their profile");
        res.json({ success: true });
    } catch (err) {
        console.error("CRITICAL: updateProfile failed:", err);
        res.status(500).json({ error: err.message });
    }
};
