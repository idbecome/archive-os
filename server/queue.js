import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Redis Connection
const connection = new IORedis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null,
    retryStrategy(times) {
        // Log only every 5 attempts to reduce noise
        if (times % 5 === 0) {
            console.warn(`[Redis] Retrying connection (attempt ${times})...`);
        }
        return Math.min(times * 500, 15000); // Max 15s delay
    }
});

let lastErrorMsg = '';
connection.on('error', (err) => {
    // Only log if the error message changed to avoid spamming the same error
    if (err.message !== lastErrorMsg) {
        console.error('[Redis] Connection Issue:', err.message);
        console.info('[Redis] Tip: Make sure Redis is running (Docker or Memurai).');
        lastErrorMsg = err.message;
    }
});

connection.on('connect', () => {
    console.log('[Redis] Connected successfully.');
    lastErrorMsg = ''; // Reset on success
});

// Initialize Queue
export const ocrQueue = new Queue('OCR_QUEUE', { connection });

// Helper to add jobs
export const addOCRJob = async (docId, filePath, fileType, originalName) => {
    console.log(`[Queue] Adding Job for DocID: ${docId}`);
    return await ocrQueue.add('process-ocr', {
        docId,
        filePath,
        fileType,
        originalName
    }, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true, // Keep cleaner
        removeOnFail: 100 // Keep some history for debugging
    });
};
