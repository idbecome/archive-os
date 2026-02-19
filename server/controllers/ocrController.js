import { knex } from '../db.js';

export const getOCRStatus = async (req, res) => {
    try {
        const jobs = await knex('job_queue')
            .select('*')
            .orderBy('created_at', 'desc')
            .limit(50);

        // Map to frontend expected format if necessary, or just return
        res.json(jobs);
    } catch (err) {
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
            error_log: null,
            updated_at: knex.fn.now()
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
