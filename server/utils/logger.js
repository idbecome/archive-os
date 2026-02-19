import { knex } from '../db.js';

/**
 * System Logger
 * Records user actions and system events to the database.
 * 
 * @param {string|null} user - Username or ID of the user performing the action
 * @param {string} action - Short description of the action (e.g., "Login", "Upload")
 * @param {string} details - Detailed description or message
 * @param {object|null} oldValue - Previous state (for audits)
 * @param {object|null} newValue - New state (for audits)
 */
export const systemLog = async (user, action, details, oldValue = null, newValue = null) => {
    try {
        const timestamp = new Date().toISOString();
        await knex('logs').insert({
            timestamp,
            user: user || 'System',
            action,
            details,
            oldValue: oldValue ? JSON.stringify(oldValue) : null,
            newValue: newValue ? JSON.stringify(newValue) : null
        });
    } catch (err) {
        console.error("Logging failed:", err);
    }
};
