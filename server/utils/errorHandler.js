import { systemLog } from './logger.js';

/**
 * Centralized Error Handler to prevent information leakage.
 * Logs the actual error stack to the server console/logs but sends
 * a generic, safe response to the client.
 * 
 * @param {Object} res - Express response object
 * @param {Error} err - The error object caught in the catch block
 * @param {string} [context="Internal Server Error"] - Optional context for logging
 * @param {number} [statusCode=500] - HTTP status code
 */
export const handleError = (res, err, context = "Internal Server Error", statusCode = 500) => {
    // 1. Log the full error stack securely on the server
    console.error(`[ERROR] ${context}:`, err);

    // 2. Log to database for UI visibility
    systemLog('System', 'System Error', `${context}: ${err.message}`).catch(console.error);

    // 2. Send generic message to client to prevent leakage of DB/File paths
    const clientMessage = statusCode === 500
        ? "Terjadi kesalahan internal pada server. Silakan hubungi administrator."
        : err.message; // Allow custom messages for 400 Bad Request etc.

    return res.status(statusCode).json({ error: clientMessage });
};
