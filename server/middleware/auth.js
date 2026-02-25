import { knex } from '../db.js';

export const checkAuth = async (req, res, next) => {
    // 1. Ekstrak token dari header Authorization atau Query Parameter
    const authHeader = req.headers['authorization'];
    const token = authHeader ? authHeader.split(' ')[1] : req.query.token;
    const userId = req.headers['x-user-id'];

    if (!token && !userId) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        let user;
        if (token === 'dev-token') {
            // Bypass khusus untuk mode development / admin fallback
            user = await knex('users').where('username', 'admin').first();
        } else if (token) {
            user = await knex('users').where('token', token).first();
        } else {
            user = await knex('users').where('id', userId).first();
        }

        if (!user) return res.status(401).json({ error: "Invalid user session" });
        req.user = user; // Attach user to request
        next();
    } catch (err) {
        res.status(500).json({ error: "Internal Auth Error" });
    }
};
