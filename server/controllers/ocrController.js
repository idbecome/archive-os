import { knex } from '../db.js';

export const getOCRStatus = async (req, res) => {
    try {
        const counts = await knex('job_queue')
            .select('status')
            .count('id as count')
            .groupBy('status');

        const countsMap = { waiting: 0, active: 0, completed: 0, failed: 0 };
        counts.forEach(c => {
            countsMap[c.status] = c.count;
        });

        const activeJobs = await knex('job_queue')
            .whereIn('status', ['waiting', 'active'])
            .orderBy('created_at', 'asc')
            .limit(10);

        const activeJobsParsed = activeJobs.map(j => ({
            id: j.id,
            status: j.status,
            progress: j.progress || 0,
            data: typeof j.data === 'string' ? JSON.parse(j.data) : j.data,
            created_at: j.created_at
        }));

        res.json({
            counts: countsMap,
            activeJobs: activeJobsParsed
        });
    } catch (err) {
        console.error("[getOCRStatus] Error:", err);
        res.status(500).json({ error: err.message });
    }
};

export const getOCRQueue = async (req, res) => {
    try {
        const jobs = await knex('job_queue')
            .whereIn('status', ['waiting', 'processing']) // Changed from 'pending' to match DB enum if needed, usually 'waiting'
            .orderBy('created_at', 'asc');

        const active = jobs.filter(j => j.status === 'processing').map(j => ({
            ...j,
            data: typeof j.data === 'string' ? JSON.parse(j.data) : j.data
        }));

        const waiting = jobs.filter(j => j.status === 'waiting').map(j => ({
            ...j,
            data: typeof j.data === 'string' ? JSON.parse(j.data) : j.data
        }));

        res.json({
            active,
            waiting,
            total: jobs.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const retryOCRJob = async (req, res) => {
    try {
        const { id } = req.params;
        await knex('job_queue').where('id', id).update({
            status: 'pending',
            attempts: 0,
            error_log: null
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const clearCompletedJobs = async (req, res) => {
    try {
        await knex('job_queue').where('status', 'completed').del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
