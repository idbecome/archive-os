import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { logger } from './logger.js';
import { knex } from '../db.js';
import { JOB_STATUS } from '../constants/status.js';

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

connection.on('ready', () => {
    logger.info('[Queue] Connected to Redis. BullMQ initialized.');
    USE_BULLMQ = true;
});

// Create BullMQ Queue Instance
export const ocrQueue = new Queue('ocr-processor', { connection });

// Tangani error pada instance Queue agar tidak muncul stack trace di konsol saat Redis mati
ocrQueue.on('error', () => { /* Error koneksi sudah ditangani oleh listener 'connection' */ });

/**
 * Universal addJob function.
 * If Redis is active, it adds a BullMQ job.
 * If not, the function does nothing because legacy Polling will automatically pick it up
 * from the database 'processing' status.
 */
export const addOcrJob = async (docId, filename, contextStr, fileType = '', originalName = '', fileSize = 0) => {
    const jobData = {
        docId,
        filename,
        fileType,
        originalName,
        fileSize,
        context: contextStr
    };

    const isPdf = fileType === 'application/pdf' || (filename && filename.toLowerCase().endsWith('.pdf'));
    // HEAVY: PDF atau Gambar > 2.5MB
    const isHeavy = isPdf || fileSize > 2.5 * 1024 * 1024;
    const lane = isHeavy ? 'HEAVY (MySQL Polling)' : 'FAST (BullMQ)';

    if (USE_BULLMQ && !isHeavy) {
        try {
            await ocrQueue.add(contextStr, jobData);
            logger.info(`[Queue] [${lane}] Job added to BullMQ: ${docId}`, { contextStr });
        } catch (error) {
            logger.error(`[Queue] Failed to add job to BullMQ: ${error.message}`);
        }
    } else {
        try {
            await knex('job_queue').insert({
                name: 'process-ocr',
                data: JSON.stringify(jobData),
                status: JOB_STATUS.WAITING,
                created_at: knex.fn.now()
            });
            logger.info(`[Queue] [${lane}] Job registered in MySQL: ${docId}`);
        } catch (error) {
            logger.error(`[Queue] Gagal memasukkan job ke MySQL: ${error.message}`);
        }
    }
};
