import winston from 'winston';
import Transport from 'winston-transport';
import { knex } from '../db.js';

// Custom Transport for Knex
class KnexTransport extends Transport {
    constructor(opts) {
        super(opts);
    }

    async log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        try {
            const { level, message, user, action, oldValue, newValue, ...rest } = info;

            // Map Winston levels to actionable strings if needed, or just use level
            const logLevel = level.toUpperCase();
            const logAction = action || logLevel;

            // If message is an object (common with Winston), stringify it with rest of metadata
            let details = message;
            if (typeof message !== 'string') {
                details = JSON.stringify({ ...message, ...rest });
            } else if (Object.keys(rest).length > 0) {
                details = `${message} ${JSON.stringify(rest)}`;
            }

            await knex('logs').insert({
                user: user || 'System',
                action: logAction,
                details: details,
                oldValue: oldValue ? (typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue)) : null,
                newValue: newValue ? (typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)) : null,
                timestamp: knex.fn.now()
            });
        } catch (err) {
            console.error('Failed to save log to DB:', err);
        }

        callback();
    }
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                })
            )
        }),
        new KnexTransport()
    ]
});

/**
 * Backward compatibility helper for existing system logs
 */
export const systemLog = async (user, action, details, oldValue = null, newValue = null) => {
    logger.info({ user, action, message: details, oldValue, newValue });
};

export default logger;
