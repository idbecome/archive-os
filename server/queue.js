import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Redis Connection
const connection = new IORedis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null,
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
