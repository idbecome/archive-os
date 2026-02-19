import { knex } from '../db.js';

export const checkAuth = async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    try {
        const user = await knex('users').where('id', userId).first();
        if (!user) return res.status(401).json({ error: "Invalid user session" });
        req.user = user; // Attach user to request
        next();
    } catch (err) {
        res.status(500).json({ error: "Internal Auth Error" });
    }
};
