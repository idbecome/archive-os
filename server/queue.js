import db from './db.js';
import * as XLSX from 'xlsx'; // Fixed for ESM
import fs from 'fs';
import path from 'path';
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

// Helper to add jobs (with deduplication)
export const addOCRJob = async (docId, filePath, fileType, originalName, context = {}) => {
    // DEDUP CHECK: Skip if a job for this docId is already waiting or active
    const existing = await new Promise((resolve, reject) => {
        db.all("SELECT id, data FROM job_queue WHERE status IN ('waiting', 'active')", [], (err, rows) => {
            if (err) return resolve(null); // On error, proceed with insertion
            if (!rows || rows.length === 0) return resolve(null);

            const match = rows.find(row => {
                try {
                    const jobData = JSON.parse(row.data);
                    return jobData.docId === docId;
                } catch (e) { return false; }
            });
            resolve(match || null);
        });
    });

    if (existing) {
        console.log(`[Queue] DEDUP: Job for DocID ${docId} already in queue (Job #${existing.id}). Skipping.`);
        return { id: existing.id, name: 'process-ocr', data: JSON.parse(existing.data), deduplicated: true };
    }

    console.log(`[Queue] Adding Job for DocID: ${docId}, Type: ${context.type || 'document'}, File: ${originalName}`);
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
