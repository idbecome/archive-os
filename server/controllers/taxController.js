import { knex } from '../db.js';
import { systemLog } from '../utils/logger.js';

// --- TAX OBJECTS ---
export const getTaxObjects = async (req, res) => {
    try {
        const objects = await knex('master_tax_objects').select('*');
        res.json(objects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createTaxObject = async (req, res) => {
    try {
        const { tax_code, name, type, rate, description } = req.body;
        const [id] = await knex('master_tax_objects').insert({
            tax_code,
            name,
            type,
            rate,
            description
        });
        await systemLog('Admin', "Create Tax Object", `Created: ${name} (${tax_code})`);
        res.json({ id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// --- TAX AUDITS ---
export const getTaxAudits = async (req, res) => {
    try {
        const audits = await knex('tax_audits').select('*').orderBy('startDate', 'desc');
        res.json(audits);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createTaxAudit = async (req, res) => {
    try {
        const { period, auditor, status, notes } = req.body;
        const [id] = await knex('tax_audits').insert({
            audit_period: period,
            auditor,
            status: status || 'pending',
            notes
        });
        await systemLog('Admin', "Create Audit", `Started audit for: ${period}`);
        res.json({ id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const updateAuditStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        await knex('tax_audits').where('id', id).update({
            status,
            notes: remarks ? knex.raw('CONCAT(notes, ?)', [`\n[${new Date().toISOString()}] ${remarks}`]) : undefined
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// --- TAX SUMMARIES ---
export const getTaxSummaries = async (req, res) => {
    try {
        const items = await knex('tax_summaries').select('*');
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const upsertTaxSummary = async (req, res) => {
    try {
        const { period, tax_type, amount, status } = req.body;
        // Check for existing record
        const existing = await knex('tax_summaries')
            .where({ period, tax_type })
            .first();

        if (existing) {
            await knex('tax_summaries')
                .where({ id: existing.id })
                .update({ amount, status, updated_at: knex.fn.now() });
        } else {
            await knex('tax_summaries').insert({
                period,
                tax_type,
                amount,
                status
            });
        }
        await systemLog('System', "Upsert Tax Summary", `Updated summary for ${period} ${tax_type}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
