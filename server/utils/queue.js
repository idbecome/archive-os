import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { logger } from './logger.js';

// Global flag to indicate if Redis is available
export let USE_BULLMQ = false;

// Initialize Redis Connection (with short timeout to fail fast if unavailable)
export const connection = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
    connectTimeout: 2000,
    retryStrategy: function (times) {
        // Do not reconnect automatically if initial connection fails
        return null;
    }
});

// Create BullMQ Queue Instance
export const ocrQueue = new Queue('ocr-processor', { connection });

connection.on('ready', () => {
    logger.info('[Queue] Connected to Redis. BullMQ initialized.');
    USE_BULLMQ = true;
});

connection.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
        if (USE_BULLMQ) {
            logger.warn('[Queue] Redis connection lost! Reverting to database polling.');
        } else {
            logger.info('[Queue] Redis unavailable, formatting to MySQL Polling framework.');
        }
        USE_BULLMQ = false;
    } else {
        logger.error(`[Queue] Redis error: ${err.message}`, { err });
    }
});

/**
 * Universal addJob function.
 * If Redis is active, it adds a BullMQ job.
 * If not, the function does nothing because legacy Polling will automatically pick it up
 * from the database 'processing' status.
 */
export const addOcrJob = async (docId, filename, contextStr, fileType = '', originalName = '') => {
    if (USE_BULLMQ) {
        try {
            await ocrQueue.add(contextStr, { docId, filename, fileType, originalName, context: contextStr });
            logger.info(`[Queue] Job added to BullMQ: ${docId}`, { contextStr });
        } catch (error) {
            logger.error(`[Queue] Failed to add job to BullMQ: ${error.message}`);
        }
    } else {
        // Fallback: Just let the MySQL poller pick it up
        logger.info(`[Queue] Database polling reserved for Job: ${docId}`, { contextStr });
    }
};
