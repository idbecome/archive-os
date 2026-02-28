import { handleError } from '../utils/errorHandler.js';
import { knex } from '../db.js';
import { systemLog } from '../utils/logger.js';
import XLSX from 'xlsx';
import fs from 'fs';

// --- TAX OBJECTS ---
export const getTaxObjects = async (req, res) => {
    try {
        const objects = await knex('master_tax_objects').select('*');
        res.json(objects);
    } catch (err) {
        handleError(res, err, "TAX Error");
    }
};

export const createTaxObject = async (req, res) => {
    try {
        const { code, name, tax_type, rate, note, is_pph21_bukan_pegawai, use_ppn, markup_mode } = req.body;
        const [id] = await knex('master_tax_objects').insert({
            code, name, tax_type,
            rate: parseFloat(rate) || 0,
            note: note || null,
            is_pph21_bukan_pegawai: is_pph21_bukan_pegawai ? 1 : 0,
            use_ppn: use_ppn !== undefined ? (use_ppn ? 1 : 0) : 1,
            markup_mode: markup_mode || 'none'
        });
        await systemLog('Admin', "Create Tax Object", `Created: ${name} (${code})`);
        res.json({ id });
    } catch (e) {
        handleError(res, e, "TAX Error");
    }
};

export const updateTaxObject = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, tax_type, rate, note, is_pph21_bukan_pegawai, use_ppn, markup_mode } = req.body;
        await knex('master_tax_objects').where('id', id).update({
            code, name, tax_type,
            rate: parseFloat(rate) || 0,
            note: note || null,
            is_pph21_bukan_pegawai: is_pph21_bukan_pegawai ? 1 : 0,
            use_ppn: use_ppn !== undefined ? (use_ppn ? 1 : 0) : 1,
            markup_mode: markup_mode || 'none'
        });
        await systemLog('Admin', "Update Tax Object", `Updated: ${name} (ID: ${id})`);
        res.json({ success: true });
    } catch (e) {
        handleError(res, e, "TAX Error");
    }
};

export const deleteTaxObject = async (req, res) => {
    try {
        const { id } = req.params;
        const obj = await knex('master_tax_objects').where('id', id).first();
        await knex('master_tax_objects').where('id', id).del();
        await systemLog('Admin', "Delete Tax Object", `Deleted: ${obj?.name || id}`);
        res.json({ success: true });
    } catch (e) {
        handleError(res, e, "TAX Error");
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
        handleError(res, err, "TAX Error");
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
        handleError(res, e, "TAX Error");
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
        handleError(res, e, "TAX Error");
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
        handleError(res, e, "TAX Error");
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
        handleError(res, e, "TAX Error");
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
        handleError(res, err, "TAX Error");
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
        handleError(res, e, "TAX Error");
    }
};

export const deleteTaxSummary = async (req, res) => {
    try {
        const { id } = req.params;
        await knex('tax_summaries').where('id', id).del();
        await systemLog('Admin', "Delete Tax Summary", `Deleted record ID: ${id}`);
        res.json({ success: true });
    } catch (e) {
        handleError(res, e, "TAX Error");
    }
};

// --- DATABASE WP (tax_objects table) ---
export const getTaxWp = async (req, res) => {
    try {
        const rows = await knex('tax_objects').select('*').orderBy('created_at', 'desc');
        res.json(rows);
    } catch (err) {
        handleError(res, err, "TAX Error");
    }
};

export const createTaxWp = async (req, res) => {
    try {
        const [id] = await knex('tax_objects').insert(req.body);
        await systemLog('Admin', "Create Tax WP", `Created entry for: ${req.body.name}`);
        res.json({ id });
    } catch (e) {
        handleError(res, e, "TAX Error");
    }
};

export const updateTaxWp = async (req, res) => {
    try {
        const { id } = req.params;
        await knex('tax_objects').where('id', id).update(req.body);
        await systemLog('Admin', "Update Tax WP", `Updated ID: ${id}`);
        res.json({ success: true });
    } catch (e) {
        handleError(res, e, "TAX Error");
    }
};

export const deleteTaxWp = async (req, res) => {
    try {
        await knex('tax_objects').where('id', req.params.id).del();
        res.json({ success: true });
    } catch (e) {
        handleError(res, e, "TAX Error");
    }
};

export const deleteAllTaxWp = async (req, res) => {
    try {
        await knex('tax_objects').del();
        await systemLog('Admin', "Delete All Tax WP", "Cleared all WP data");
        res.json({ success: true });
    } catch (e) {
        handleError(res, e, "TAX Error");
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
        handleError(res, err, "TAX Error");
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
        handleError(res, e, "TAX Error");
    }
};

// --- IMPORT FUNCTIONS ---
export const importTaxObjects = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!rawData || rawData.length === 0) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: "File Excel kosong atau tidak terbaca" });
        }

        const formattedData = rawData.map(item => {
            // Helper to find key case-insensitively
            const getVal = (possibleKeys) => {
                const actualKeys = Object.keys(item);
                for (const pk of possibleKeys) {
                    const match = actualKeys.find(ak => ak.toLowerCase().replace(/_/g, '') === pk.toLowerCase().replace(/_/g, ''));
                    if (match) return item[match];
                }
                return undefined;
            };

            return {
                code: getVal(['tax_object_code', 'code', 'kode']),
                name: getVal(['tax_object_name', 'name', 'nama']),
                tax_type: String(getVal(['tax_type', 'type', 'jenis']) || ''),
                rate: parseFloat(getVal(['rate', 'tarif']) || 0),
                note: getVal(['note', 'description', 'keterangan']),
                is_pph21_bukan_pegawai: getVal(['is_pph21_bukan_pegawai', 'isPph21BukanPegawai']) ? 1 : 0,
                use_ppn: getVal(['use_ppn', 'usePpn']) !== undefined ? (getVal(['use_ppn', 'usePpn']) ? 1 : 0) : 1,
                markup_mode: getVal(['markup_mode', 'markupMode']) || 'none'
            };
        }).filter(row => row.code && row.name);

        if (formattedData.length === 0) {
            console.warn("[Import Master] No valid rows found. Raw Data Sample:", rawData[0]);
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: "Tidak ada data valid yang ditemukan. Pastikan kolom 'code' dan 'name' tersedia." });
        }

        let importCount = 0;
        for (const row of formattedData) {
            try {
                const existing = await knex('master_tax_objects').where('code', row.code).first();
                if (existing) {
                    await knex('master_tax_objects').where('code', row.code).update(row);
                } else {
                    await knex('master_tax_objects').insert(row);
                }
                importCount++;
            } catch (rowErr) {
                console.error(`[Import Master] Row error (${row.code}):`, rowErr.message);
            }
        }

        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        await systemLog('Admin', "Import Tax Objects", `Success: ${importCount}/${formattedData.length} records`);
        res.json({ message: `Berhasil mengimport ${importCount} data master objek pajak` });
    } catch (e) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error("Import Master fatal error:", e);
        handleError(res, e, "TAX Error");
    }
};

export const importTaxWp = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const formattedData = data.map(item => ({
            id_type: item.id_type || item.idType || 'NPWP',
            identity_number: item.identity_number || item.identityNumber,
            name: item.name,
            email: item.email,
            tax_type: item.tax_type || item.taxType,
            tax_object_code: item.tax_object_code || item.taxObjectCode,
            tax_object_name: item.tax_object_name || item.taxObjectName,
            dpp: item.dpp || 0,
            rate: item.rate || 0,
            pph: item.pph || 0,
            ppn: item.ppn || 0,
            total_payable: item.total_payable || item.totalPayable || 0,
            discount: item.discount || 0,
            dpp_net: item.dpp_net || item.dppNet || 0,
            markup_mode: item.markup_mode || item.markupMode || 'none',
            is_pph21_bukan_pegawai: item.is_pph21_bukan_pegawai !== undefined ? item.is_pph21_bukan_pegawai : (item.isPph21BukanPegawai ? 1 : 0),
            use_ppn: item.use_ppn !== undefined ? item.use_ppn : (item.usePpn !== undefined ? (item.usePpn ? 1 : 0) : 1)
        })).filter(row => row.identity_number); // Filter out rows without identity number

        if (formattedData.length === 0) {
            return res.status(400).json({ error: "Tidak ada data valid yang ditemukan dalam file" });
        }

        // Batch upsert based on identity_number and tax_object_code? 
        // Or just insert? User might want to update existing.
        for (const row of formattedData) {
            try {
                const existing = await knex('tax_objects')
                    .where({ identity_number: row.identity_number, tax_object_code: row.tax_object_code })
                    .first();

                if (existing) {
                    await knex('tax_objects').where('id', existing.id).update(row);
                } else {
                    await knex('tax_objects').insert(row);
                }
            } catch (rowErr) {
                console.error(`Error importing WP row ${row.identity_number}:`, rowErr);
            }
        }

        // Cleanup
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        await systemLog('Admin', "Import Tax WP", `Imported ${formattedData.length} records`);
        res.json({ message: `Berhasil mengimport ${formattedData.length} data wajib pajak` });
    } catch (e) {
        console.error("Import WP error:", e);
        handleError(res, e, "TAX Error");
    }
};
