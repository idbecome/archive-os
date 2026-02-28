import { knex } from './db.js';
import { JOB_STATUS } from './constants/status.js';

// Simple MySQL-based Queue Replacement for BullMQ
class DbQueue {
    constructor(name) {
        this.name = name;
    }

    async add(name, data, opts = {}) {
        const jobData = {
            name,
            data: JSON.stringify(data),
            status: JOB_STATUS.WAITING,
            created_at: knex.fn.now(),
            max_attempts: opts.max_attempts !== undefined ? opts.max_attempts : 3,
            retries: 0
        };
        try {
            console.log("Attempting to add job to queue with data:", jobData);
            const [id] = await knex('job_queue').insert(jobData);
            return { id, name, data };
        } catch (err) {
            console.error("Queue Add Error:", err.message);
            console.error("Job data that failed:", jobData);
            throw err;
        }
    }

    async getJobCounts() {
        try {
            const rows = await knex('job_queue')
                .select('status')
                .count('* as count')
                .groupBy('status');

            const counts = { active: 0, waiting: 0, completed: 0, failed: 0 };
            rows.forEach(r => {
                if (counts[r.status] !== undefined) counts[r.status] = r.count;
            });
            return counts;
        } catch (err) {
            console.error("Queue Counts Error:", err);
            return { active: 0, waiting: 0, completed: 0, failed: 0 };
        }
    }

    async getJobs(types, start, end, asc) {
        try {
            if (!types || types.length === 0) return [];

            const rows = await knex('job_queue')
                .whereIn('status', types)
                .orderBy('created_at', asc ? 'asc' : 'desc')
                .limit((end - start) + 1)
                .offset(start);

            return rows.map(r => ({
                id: r.id,
                data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data,
                progress: r.progress || 0,
                status: r.status,
                finishedOn: r.finished_at ? new Date(r.finished_at).getTime() : null,
                error: r.error
            }));
        } catch (err) {
            console.error("Queue GetJobs Error:", err);
            return [];
        }
    }
}

export const ocrQueue = new DbQueue('OCR_QUEUE');

// Helper to add jobs (with deduplication)
export const addOCRJob = async (docId, filePath, fileType, originalName, context = {}) => {
    try {
        // DEDUP CHECK: Skip if a job for this docId AND filePath is already waiting or active
        const existing = await knex('job_queue')
            .whereIn('status', [JOB_STATUS.WAITING, JOB_STATUS.ACTIVE])
            .where('data', 'like', `%"docId":"${docId}"%`)
            .where('data', 'like', `%"filePath":"${filePath.replace(/\\/g, '\\\\')}"%`)
            .first();

        if (existing) {
            console.log(`[Queue] DEDUP: Job for DocID ${docId} with same file path already in queue (Job #${existing.id}). Skipping.`);
            return {
                id: existing.id,
                name: 'process-ocr',
                data: typeof existing.data === 'string' ? JSON.parse(existing.data) : existing.data,
                deduplicated: true
            };
        }

        console.log(`[Queue] Adding Job for DocID: ${docId}, Type: ${context.type || 'document'}, File: ${originalName}`);

        return await ocrQueue.add('process-ocr', {
            docId,
            filePath,
            fileType,
            originalName,
            context
        });
    } catch (err) {
        console.error("AddOCRJob Error:", err);
        // Fallback or re-throw
        return null;
    }
};
