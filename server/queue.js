import { knex } from './db.js';

// Simple MySQL-based Queue Replacement for BullMQ
class DbQueue {
    constructor(name) {
        this.name = name;
    }

    async add(name, data, opts) {
        try {
            const [id] = await knex('job_queue').insert({
                name,
                data: JSON.stringify(data),
                status: 'waiting',
                created_at: knex.fn.now()
            });
            return { id, name, data };
        } catch (err) {
            console.error("Queue Add Error:", err);
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
        // DEDUP CHECK: Skip if a job for this docId is already waiting or active
        const existing = await knex('job_queue')
            .whereIn('status', ['waiting', 'active'])
            .where('data', 'like', `%"docId":"${docId}"%`)
            .first();

        if (existing) {
            console.log(`[Queue] DEDUP: Job for DocID ${docId} already in queue (Job #${existing.id}). Skipping.`);
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
