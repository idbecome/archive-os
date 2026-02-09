import db from './db.js';

// Simple MySQL-based Queue Replacement for BullMQ
class DbQueue {
    constructor(name) {
        this.name = name;
    }

    async add(name, data, opts) {
        return new Promise((resolve, reject) => {
            const sql = "INSERT INTO job_queue (name, data, status, created_at) VALUES (?, ?, 'waiting', NOW())";
            db.run(sql, [name, JSON.stringify(data)], function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, name, data });
            });
        });
    }

    async getJobCounts(...statuses) {
        return new Promise((resolve, reject) => {
            db.all("SELECT status, COUNT(*) as count FROM job_queue GROUP BY status", [], (err, rows) => {
                if (err) return reject(err);
                const counts = { active: 0, waiting: 0, completed: 0, failed: 0 };
                if (rows) {
                    rows.forEach(r => {
                        if (counts[r.status] !== undefined) counts[r.status] = r.count;
                    });
                }
                resolve(counts);
            });
        });
    }

    async getJobs(types, start, end, asc) {
        return new Promise((resolve, reject) => {
            if (!types || types.length === 0) return resolve([]);
            const placeholders = types.map(() => '?').join(',');
            const limit = (end - start) + 1;
            const offset = start;
            const order = asc ? 'ASC' : 'DESC';

            const sql = `SELECT * FROM job_queue WHERE status IN (${placeholders}) ORDER BY created_at ${order} LIMIT ? OFFSET ?`;
            const params = [...types, limit, offset];

            db.all(sql, params, (err, rows) => {
                if (err) return reject(err);
                resolve((rows || []).map(r => ({
                    id: r.id,
                    data: JSON.parse(r.data),
                    progress: r.progress || 0,
                    status: r.status,
                    finishedOn: r.finished_at ? new Date(r.finished_at).getTime() : null
                })));
            });
        });
    }
}

export const ocrQueue = new DbQueue('OCR_QUEUE');

// Helper to add jobs
export const addOCRJob = async (docId, filePath, fileType, originalName, context = {}) => {
    console.log(`[Queue] Adding Job for DocID: ${docId}, Type: ${context.type || 'document'}`);
    return await ocrQueue.add('process-ocr', {
        docId,
        filePath,
        fileType,
        originalName,
        context // NEW: Metadata for worker (e.g. inventory slot/ordner/invoice IDs)
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
