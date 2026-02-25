import { knex } from '../db.js';
import { JOB_STATUS } from '../constants/status.js';

export const getOCRStatus = async (req, res) => {
    try {
        const counts = await knex('job_queue')
            .select('status')
            .count('id as count')
            .groupBy('status');

        const countsMap = {
            [JOB_STATUS.WAITING]: 0,
            [JOB_STATUS.ACTIVE]: 0,
            [JOB_STATUS.COMPLETED]: 0,
            [JOB_STATUS.FAILED]: 0
        };
        counts.forEach(c => {
            if (countsMap[c.status] !== undefined) countsMap[c.status] = c.count;
        });

        const activeJobs = await knex('job_queue')
            .whereIn('status', [JOB_STATUS.WAITING, JOB_STATUS.ACTIVE])
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
            .whereIn('status', [JOB_STATUS.WAITING, JOB_STATUS.ACTIVE])
            .orderBy('created_at', 'asc');

        const active = jobs.filter(j => j.status === JOB_STATUS.ACTIVE).map(j => ({
            ...j,
            data: typeof j.data === 'string' ? JSON.parse(j.data) : j.data
        }));

        const waiting = jobs.filter(j => j.status === JOB_STATUS.WAITING).map(j => ({
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
            status: JOB_STATUS.WAITING,
            progress: 0,
            error: null,
            processed_at: null,
            finished_at: null
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const clearCompletedJobs = async (req, res) => {
    try {
        await knex('job_queue').where('status', JOB_STATUS.COMPLETED).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
