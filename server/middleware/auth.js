import { knex } from '../db.js';

export const checkAuth = async (req, res, next) => {
    // 1. Ekstrak token dari Cookie (HttpOnly), header Authorization, atau Query Parameter
    const token = req.cookies?.token ||
        (req.headers['authorization'] ? req.headers['authorization'].split(' ')[1] : req.query.token);
    const userId = req.headers['x-user-id'];

    if (!token && !userId) {
        const hasCookies = req.cookies ? Object.keys(req.cookies).length : 0;
        console.warn(`[Auth] Blocked: No token or userId. IP: ${req.ip} URL: ${req.originalUrl}. Cookies count: ${hasCookies}`);
        if (hasCookies > 0) console.log(`[Auth] Cookies present: ${Object.keys(req.cookies).join(', ')}`);
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
