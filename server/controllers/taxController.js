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
        // Parse steps JSON if it's a string
        const parsedAudits = audits.map(a => ({
            ...a,
            steps: typeof a.steps === 'string' ? JSON.parse(a.steps) : (a.steps || [])
        }));
        res.json(parsedAudits);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createTaxAudit = async (req, res) => {
    try {
        const data = { ...req.body };

        // Handle object fields
        if (data.steps && typeof data.steps !== 'string') {
            data.steps = JSON.stringify(data.steps);
        }

        await knex('tax_audits').insert(data);
        await systemLog('Admin', "Create Audit", `Started audit for: ${data.title}`);
        res.json({ success: true, id: data.id });
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

export const updateTaxAudit = async (req, res) => {
    try {
        const { id } = req.params;
        const data = { ...req.body };

        // Flatten steps if they are provided as an object/array
        if (data.steps && typeof data.steps !== 'string') {
            data.steps = JSON.stringify(data.steps);
        }

        await knex('tax_audits').where('id', id).update(data);
        await systemLog('Admin', "Update Audit", `Updated audit ID: ${id}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const deleteTaxAudit = async (req, res) => {
    try {
        const { id } = req.params;
        await knex('tax_audits').where('id', id).del();
        // Also delete associated notes
        await knex('tax_audit_notes').where('auditId', id).del();
        await systemLog('Admin', "Delete Audit", `Deleted audit ID: ${id}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// --- TAX SUMMARIES ---
export const getTaxSummaries = async (req, res) => {
    try {
        const items = await knex('tax_summaries').select('*');
        const parsedItems = items.map(item => ({
            ...item,
            data: typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || {})
        }));
        res.json(parsedItems);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const upsertTaxSummary = async (req, res) => {
    try {
        const { id, type, month, year, pembetulan, data } = req.body;

        // Stringify data if it's an object
        const finalData = typeof data === 'string' ? data : JSON.stringify(data || {});

        // Generate a unique ID if not provided (for new records)
        // Format: type_month_year_pembetulan (e.g. PPH_Februari_2026_0)
        const recordId = id || `${type}_${month}_${year}_${pembetulan}`;

        // Check for existing record by ID or by the specific combination
        const existing = await knex('tax_summaries')
            .where('id', recordId)
            .orWhere({ type, month, year, pembetulan })
            .first();

        if (existing) {
            await knex('tax_summaries')
                .where({ id: existing.id })
                .update({
                    data: finalData,
                    pembetulan: pembetulan || 0 // Update pembetulan if needed
                });
        } else {
            await knex('tax_summaries').insert({
                id: recordId,
                type,
                month,
                year,
                pembetulan: pembetulan || 0,
                data: finalData
            });
        }

        await systemLog('System', "Upsert Tax Summary", `Updated summary for ${month} ${year} (${type})`);
        res.json({ success: true, id: recordId });
    } catch (e) {
        console.error("Upsert Tax Summary Error:", e);
        res.status(500).json({ error: e.message });
    }
};

export const deleteTaxSummary = async (req, res) => {
    try {
        const { id } = req.params;
        await knex('tax_summaries').where('id', id).del();
        await systemLog('Admin', "Delete Tax Summary", `Deleted record ID: ${id}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// --- DATABASE WP (tax_objects table) ---
export const getTaxWp = async (req, res) => {
    try {
        const rows = await knex('tax_objects').select('*').orderBy('created_at', 'desc');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createTaxWp = async (req, res) => {
    try {
        const [id] = await knex('tax_objects').insert(req.body);
        await systemLog('Admin', "Create Tax WP", `Created entry for: ${req.body.name}`);
        res.json({ id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const updateTaxWp = async (req, res) => {
    try {
        const { id } = req.params;
        await knex('tax_objects').where('id', id).update(req.body);
        await systemLog('Admin', "Update Tax WP", `Updated ID: ${id}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const deleteTaxWp = async (req, res) => {
    try {
        await knex('tax_objects').where('id', req.params.id).del();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const deleteAllTaxWp = async (req, res) => {
    try {
        await knex('tax_objects').del();
        await systemLog('Admin', "Delete All Tax WP", "Cleared all WP data");
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// --- TAX AUDIT NOTES ---
export const getAuditNotes = async (req, res) => {
    try {
        const { id, stepIndex } = req.params;
        const notes = await knex('tax_audit_notes')
            .where({ auditId: id, stepIndex: stepIndex })
            .orderBy('timestamp', 'asc');
        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const addAuditNote = async (req, res) => {
    try {
        const { id, stepIndex } = req.params;
        const { user, text } = req.body;

        let attachmentUrl = null;
        let attachmentName = null;
        let attachmentType = null;
        let attachmentSize = null;

        if (req.file) {
            attachmentUrl = `/uploads/${req.file.filename}`;
            attachmentName = req.file.originalname;
            attachmentType = req.file.mimetype;
            attachmentSize = (req.file.size / 1024).toFixed(2) + ' KB';
        }

        const [noteId] = await knex('tax_audit_notes').insert({
            auditId: id,
            stepIndex,
            user,
            text,
            attachmentUrl,
            attachmentName,
            attachmentType,
            attachmentSize
        });

        await systemLog(user || 'System', "Add Audit Note", `Added note to audit ${id} step ${stepIndex}`);
        res.json({ success: true, id: noteId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
