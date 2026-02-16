import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import db, { knex } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import bcrypt from 'bcrypt';
import { addOCRJob, ocrQueue } from './queue.js'; // NEW
import { generateEmbedding, parseIntent, cosineSimilarity, generateAnswer } from './ai_search.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', cors(), express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- STANDALONE UPLOAD API ---
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({
        success: true,
        url: `/uploads/${req.file.filename}`,
        filename: req.file.originalname
    });
});

// --- OCR QUEUE API ---
app.get('/api/ocr/queue', async (req, res) => {
    try {
        const rows = await knex('job_queue').whereIn('status', ['waiting', 'active']).orderBy('created_at', 'asc');
        const waiting = rows.filter(r => r.status === 'waiting').map(r => ({ ...r, data: JSON.parse(r.data || '{}') }));
        const active = rows.filter(r => r.status === 'active').map(r => ({ ...r, data: JSON.parse(r.data || '{}') }));
        res.json({
            waiting,
            active,
            total: waiting.length + active.length
        });
    } catch (err) {
        console.error("Queue Parse Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/ocr/status', async (req, res) => {
    try {
        const counts = await knex('job_queue')
            .select(
                knex.raw('SUM(CASE WHEN status = "active" THEN 1 ELSE 0 END) as active'),
                knex.raw('SUM(CASE WHEN status = "waiting" THEN 1 ELSE 0 END) as waiting'),
                knex.raw('SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed'),
                knex.raw('SUM(CASE WHEN status = "failed" THEN 1 ELSE 0 END) as failed')
            )
            .first();

        const rows = await knex('job_queue')
            .where('status', 'active')
            .limit(5);

        const activeJobs = (rows || []).map(r => ({
            id: r.id,
            data: JSON.parse(r.data || '{}'),
            progress: r.progress
        }));

        res.json({
            counts: {
                active: counts?.active || 0,
                waiting: counts?.waiting || 0,
                completed: counts?.completed || 0,
                failed: counts?.failed || 0
            },
            activeJobs
        });
    } catch (e) {
        console.error("Status Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- PUSTAKA (KNOWLEDGE BASE) API ---
app.get('/api/pustaka/guides', async (req, res) => {
    try {
        const rows = await knex('pustaka_guides').orderBy(['category', { column: 'title', order: 'asc' }]);
        const result = (rows || []).map(r => ({
            ...r,
            allowed_depts: r.allowed_depts ? JSON.parse(r.allowed_depts) : [],
            allowed_users: r.allowed_users ? JSON.parse(r.allowed_users) : []
        }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/pustaka/search', async (req, res) => {
    try {
        const q = req.query.q;
        if (!q) return res.json([]);

        const term = `%${q}%`;
        const rows = await knex('pustaka_guides as g')
            .distinct('g.*')
            .leftJoin('pustaka_slides as s', 'g.id', 's.guide_id')
            .where('g.title', 'like', term)
            .orWhere('g.description', 'like', term)
            .orWhere('g.category', 'like', term)
            .orWhere('s.title', 'like', term)
            .orWhere('s.content', 'like', term)
            .orderBy('g.title', 'asc');

        res.json(rows || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/pustaka/categories', async (req, res) => {
    try {
        const rows = await knex('pustaka_categories').orderBy('name', 'asc');
        res.json(rows || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pustaka/categories', async (req, res) => {
    try {
        const { name } = req.body;
        const [id] = await knex('pustaka_categories').insert({ name });
        res.json({ success: true, id: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/pustaka/categories/:id', async (req, res) => {
    try {
        await knex('pustaka_categories').where('id', req.params.id).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/pustaka/guides/:id/slides', async (req, res) => {
    try {
        const rows = await knex('pustaka_slides').where('guide_id', req.params.id).orderBy('step_order', 'asc');
        res.json(rows || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pustaka/guides', async (req, res) => {
    try {
        const { title, description, category, icon, privacy, allowed_depts, allowed_users, owner } = req.body;
        const [id] = await knex('pustaka_guides').insert({
            title,
            description,
            category,
            icon,
            privacy: privacy || 'public',
            allowed_depts: JSON.stringify(allowed_depts || []),
            allowed_users: JSON.stringify(allowed_users || []),
            owner
        });
        res.json({ success: true, id: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/pustaka/guides/:id', async (req, res) => {
    try {
        const { title, description, category, icon, privacy, allowed_depts, allowed_users } = req.body;
        await knex('pustaka_guides')
            .where('id', req.params.id)
            .update({
                title,
                description,
                category,
                icon,
                privacy,
                allowed_depts: JSON.stringify(allowed_depts || []),
                allowed_users: JSON.stringify(allowed_users || [])
            });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/pustaka/guides/:id', async (req, res) => {
    try {
        const guideId = req.params.id;
        await knex.transaction(async trx => {
            await trx('pustaka_guides').where('id', guideId).del();
            await trx('pustaka_slides').where('guide_id', guideId).del();
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/pustaka/slides/by-guide/:id', async (req, res) => {
    try {
        await knex('pustaka_slides').where('guide_id', req.params.id).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pustaka/slides', async (req, res) => {
    try {
        const { guide_id, title, content, image, step_order } = req.body;
        const [id] = await knex('pustaka_slides').insert({
            guide_id,
            title,
            content,
            image,
            step_order
        });
        res.json({ success: true, id: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- DOCUMENT APPROVAL API ---
app.get('/api/approvals', async (req, res) => {
    try {
        const approvals = await knex('document_approvals').orderBy('created_at', 'desc');
        const steps = await knex('approval_steps').orderBy(['approval_id', { column: 'step_index', order: 'asc' }]);

        const result = (approvals || []).map(item => ({
            ...item,
            steps: (steps || []).filter(s => s.approval_id === item.id)
        }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/approvals', async (req, res) => {
    try {
        const { title, description, division, requester_name, requester_username, attachment_url, attachment_name, steps, flow_id } = req.body;
        const now = new Date().toISOString();

        const [approvalId] = await knex.transaction(async trx => {
            const [newApprovalId] = await trx('document_approvals').insert({
                title,
                description,
                division,
                requester_name,
                requester_username,
                attachment_url,
                attachment_name,
                status: 'Pending',
                created_at: now,
                current_step_index: 0,
                flow_id: flow_id || null
            });

            const stepInserts = (steps || []).map((step, index) => ({
                approval_id: newApprovalId,
                step_index: index,
                approver_username: step.username,
                approver_name: step.name,
                node_id: step.nodeId || null
            }));

            if (stepInserts.length > 0) {
                await trx('approval_steps').insert(stepInserts);
            }

            return [newApprovalId];
        });

        res.json({ success: true, id: approvalId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/approvals/:id/action', upload.single('file'), async (req, res) => {
    try {
        const { action, note, username } = req.body;
        const approvalId = req.params.id;
        const now = new Date().toISOString();

        let attachment_url = null;
        let attachment_name = null;
        if (req.file) {
            attachment_url = `/uploads/${req.file.filename}`;
            attachment_name = req.file.originalname;
        }

        await knex.transaction(async trx => {
            const approval = await trx('document_approvals').where('id', approvalId).first();
            if (!approval) throw new Error("Approval not found");

            const currentIndex = approval.current_step_index;

            // Update current step
            await trx('approval_steps')
                .where({ approval_id: approvalId, step_index: currentIndex, approver_username: username })
                .update({
                    status: action === 'Approve' ? 'Approved' : 'Rejected',
                    action_date: now,
                    note: note,
                    attachment_url: attachment_url,
                    attachment_name: attachment_name
                });

            if (action === 'Reject') {
                await trx('document_approvals').where('id', approvalId).update({ status: 'Rejected' });
                res.json({ success: true, status: 'Rejected' });
            } else {
                const stepCount = await trx('approval_steps').where('approval_id', approvalId).count('id as count').first();
                const nextIndex = currentIndex + 1;

                if (nextIndex < stepCount.count) {
                    await trx('document_approvals').where('id', approvalId).update({ current_step_index: nextIndex });
                    res.json({ success: true, status: 'Pending', nextStep: nextIndex });
                } else {
                    await trx('document_approvals').where('id', approvalId).update({ status: 'Approved' });

                    // Post-approval logic (OCR etc.)
                    const app = await trx('document_approvals').where('id', approvalId).first();
                    if (app && app.attachment_url) {
                        const parent = await trx('folders').where('name', 'ApprovalDoc').andWhere(function () {
                            this.whereNull('parentId').orWhere('parentId', 0).orWhere('parentId', 'null');
                        }).first();

                        if (parent) {
                            const folder = await trx('folders').where({ name: app.title, parentId: parent.id }).first();
                            if (folder) {
                                const docId = `DOC-APP-${Date.now()}`;
                                const ext = path.extname(app.attachment_name || '').toLowerCase();
                                let type = 'application/pdf';
                                if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) type = 'image/jpeg';

                                await trx('documents').insert({
                                    id: docId,
                                    title: app.attachment_name,
                                    type: type,
                                    size: '0 KB',
                                    uploadDate: now,
                                    url: app.attachment_url,
                                    folderId: folder.id,
                                    department: app.division,
                                    owner: app.requester_name,
                                    status: 'processing',
                                    ocrContent: ''
                                });

                                const filename = path.basename(app.attachment_url);
                                const absolutePath = path.join(UPLOADS_DIR, filename);
                                addOCRJob(docId, absolutePath, type, app.attachment_name, {
                                    type: 'document',
                                    documentId: docId,
                                    approvalId: approvalId
                                }).catch(e => console.error("Final Approval OCR Error:", e));
                            }
                        }
                    }
                    res.json({ success: true, status: 'Approved' });
                }
            }
        });
    } catch (err) {
        console.error("Approval Action Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/approvals/:id/reset-step', async (req, res) => {
    try {
        const { stepIndex } = req.body;
        const approvalId = req.params.id;

        await knex.transaction(async trx => {
            await trx('document_approvals')
                .where('id', approvalId)
                .update({ current_step_index: stepIndex, status: 'Pending' });

            await trx('approval_steps')
                .where('approval_id', approvalId)
                .andWhere('step_index', '>=', stepIndex)
                .update({
                    status: 'Pending',
                    action_date: null,
                    note: null,
                    attachment_url: null,
                    attachment_name: null
                });
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/approvals/:id', async (req, res) => {
    try {
        const { title, description, division, attachment_url, attachment_name, steps } = req.body;
        const approvalId = req.params.id;

        await knex.transaction(async trx => {
            const oldRow = await trx('document_approvals').where('id', approvalId).select('attachment_url').first();
            const attachmentChanged = oldRow && oldRow.attachment_url !== attachment_url;

            const updateData = {
                title,
                description,
                division,
                attachment_url,
                attachment_name,
                status: 'Pending',
                current_step_index: 0
            };
            if (attachmentChanged) updateData.ocr_content = null;

            await trx('document_approvals').where('id', approvalId).update(updateData);

            await trx('approval_steps').where('approval_id', approvalId).del();

            const stepInserts = (steps || []).map((step, index) => ({
                approval_id: approvalId,
                step_index: index,
                approver_username: step.username,
                approver_name: step.name,
                node_id: step.nodeId || null
            }));

            if (stepInserts.length > 0) {
                await trx('approval_steps').insert(stepInserts);
            }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/approvals/:id', async (req, res) => {
    try {
        await knex('document_approvals').where('id', req.params.id).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- APPROVAL FLOWS (MASTER) API ---
app.get('/api/approval-flows', async (req, res) => {
    try {
        const rows = await knex('approval_flows').orderBy('name', 'asc');
        const result = (rows || []).map(r => {
            try {
                return {
                    ...r,
                    steps: JSON.parse(r.steps || '[]'),
                    visual_config: r.visual_config ? JSON.parse(r.visual_config) : null
                };
            }
            catch (e) { return { ...r, steps: [], visual_config: null }; }
        });
        res.json(result);
    } catch (err) {
        console.error("Database Error (approval-flows):", err.message);
        res.status(500).json({ error: "Gagal mengambil data alur. Pastikan tabel approval_flows sudah dibuat." });
    }
});

app.post('/api/approval-flows', async (req, res) => {
    try {
        const { name, description, steps, visual_config } = req.body;
        const [id] = await knex('approval_flows').insert({
            name,
            description,
            steps: JSON.stringify(steps || []),
            visual_config: JSON.stringify(visual_config || null)
        });
        res.json({ success: true, id: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/approval-flows/:id', async (req, res) => {
    try {
        const { name, description, steps, visual_config } = req.body;
        await knex('approval_flows').where('id', req.params.id).update({
            name,
            description,
            steps: JSON.stringify(steps || []),
            visual_config: JSON.stringify(visual_config || null)
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/approval-flows/:id', async (req, res) => {
    try {
        await knex('approval_flows').where('id', req.params.id).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper: Save Base64 to File

// --- UNIVERSAL SEARCH API (AI SEMANTIC) ---
app.get('/api/search', async (req, res) => {
    try {
        const query = (req.query.q || '').toLowerCase();
        if (!query) return res.json([]);

        // 1. Search Documents
        const docPromise = (async () => {
            try {
                const rows = await knex('documents');
                return (rows || []).filter(doc => {
                    const title = (doc.title || '').toLowerCase();
                    const ocr = (doc.ocrContent || '').toLowerCase();
                    return title.includes(query) || ocr.includes(query);
                }).map(doc => {
                    let score = 0;
                    const title = (doc.title || '').toLowerCase();
                    if (title.includes(query)) score += 0.5;
                    if (doc.ocrContent && doc.ocrContent.toLowerCase().includes(query)) score += 0.3;
                    if (title === query) score += 0.5;

                    return {
                        id: doc.id,
                        title: doc.title,
                        type: doc.type || 'document',
                        size: doc.size,
                        uploadDate: doc.uploadDate,
                        folderId: doc.folderId,
                        folderName: 'Digital Archive',
                        score: score,
                        matchType: 'document'
                    };
                });
            } catch { return []; }
        })();

        // 2. Search Inventory (Invoices inside Boxes)
        const invPromise = (async () => {
            try {
                const term = `%${query}%`;
                const rows = await knex('inventory_items as i')
                    .select('i.*', 'inv.box_data')
                    .leftJoin('inventory as inv', 'i.inventory_id', 'inv.id')
                    .where('i.invoice_no', 'like', term)
                    .orWhere('i.vendor', 'like', term)
                    .orWhere('i.ocr_content', 'like', term)
                    .limit(50);

                return (rows || []).map(item => {
                    let score = 0;
                    const invNo = (item.invoice_no || '').toLowerCase();
                    const vendor = (item.vendor || '').toLowerCase();
                    const ocr = (item.ocr_content || '').toLowerCase();

                    if (invNo.includes(query)) score += 0.5;
                    if (vendor.includes(query)) score += 0.4;
                    if (ocr.includes(query)) score += 0.3;

                    return {
                        id: `INV-${item.id}`,
                        title: `Invoice: ${item.invoice_no} (${item.vendor})`,
                        type: item.file_url && item.file_url.match(/image\//) ? 'image/jpeg' : 'application/pdf',
                        size: 'Invoice',
                        uploadDate: item.date || new Date().toISOString(),
                        folderId: 'INVENTORY',
                        folderName: `Box ${item.box_id} / Ordner ${item.ordner_id}`,
                        score: score,
                        matchType: 'invoice',
                        data: {
                            id: item.id,
                            invoiceNo: item.invoice_no,
                            vendor: item.vendor,
                            paymentDate: item.date,
                            totalAmount: item.amount,
                            file: item.file_url,
                            ocrContent: item.ocr_content,
                            fileName: 'Invoice'
                        },
                        boxId: item.box_id,
                        slotId: item.inventory_id,
                        ocrContent: item.ocr_content,
                        url: item.file_url
                    };
                });
            } catch { return []; }
        })();

        // 3. Search External Items (Indoarsip)
        const extPromise = (async () => {
            try {
                const rows = await knex('external_items');
                const matches = [];
                (rows || []).forEach(item => {
                    const boxId = (item.boxId || '').toLowerCase();
                    const dest = (item.destination || '').toLowerCase();
                    const sender = (item.sender || '').toLowerCase();
                    let score = 0;
                    let found = false;

                    if (boxId.includes(query)) { score += 0.6; found = true; }
                    if (dest.includes(query)) { score += 0.4; found = true; }
                    if (sender.includes(query)) { score += 0.4; found = true; }

                    let boxDataFound = false;
                    try {
                        const data = JSON.parse(item.boxData || '{}');
                        if (data.ordners) {
                            data.ordners.forEach(ord => {
                                if (String(ord.noOrdner || '').toLowerCase().includes(query)) boxDataFound = true;
                                if (ord.invoices) {
                                    ord.invoices.forEach(inv => {
                                        if (String(inv.invoiceNo || '').toLowerCase().includes(query)) boxDataFound = true;
                                        if (String(inv.vendor || '').toLowerCase().includes(query)) boxDataFound = true;
                                    });
                                }
                            });
                        }
                    } catch { }

                    if (boxDataFound) { score += 0.3; found = true; }

                    if (found) {
                        matches.push({
                            id: `EXT-${item.id}`,
                            title: `Box Eksternal: ${item.boxId}`,
                            type: 'external',
                            size: item.destination,
                            uploadDate: item.sentDate,
                            folderId: 'INVENTORY_EXT',
                            folderName: '📦 Box Eksternal (Indoarsip)',
                            score: score,
                            matchType: 'external_item',
                            data: item
                        });
                    }
                });
                return matches;
            } catch { return []; }
        })();

        // 4. Search Tax Summaries
        const taxSumPromise = (async () => {
            try {
                const rows = await knex('tax_summaries');
                const matches = [];
                (rows || []).forEach(record => {
                    const month = (record.month || '').toLowerCase();
                    const year = String(record.year || '').toLowerCase();
                    let score = 0;
                    let found = false;

                    if (month.includes(query)) { score += 0.5; found = true; }
                    if (year.includes(query)) { score += 0.5; found = true; }

                    if (!isNaN(query) && query.length > 3) {
                        const dataStr = typeof record.data === 'string' ? record.data : JSON.stringify(record.data || {});
                        if (dataStr.toLowerCase().includes(query)) { score += 0.4; found = true; }
                    }

                    if (found) {
                        matches.push({
                            id: `TAXSUM-${record.id}`,
                            title: `Ringkasan Pajak ${record.month} ${record.year}`,
                            type: 'tax_summary',
                            size: `PPH 23: ${record.pph23}`,
                            uploadDate: new Date().toISOString(),
                            folderId: 'TAX_SUMMARY',
                            folderName: '📊 Tax Compliance',
                            score: score,
                            matchType: 'tax_summary',
                            data: record
                        });
                    }
                });
                return matches;
            } catch { return []; }
        })();

        // 5. Search Tax Objects (Database WP)
        const taxObjPromise = (async () => {
            try {
                const rows = await knex('tax_objects');
                return (rows || []).filter(item => {
                    const name = (item.name || '').toLowerCase();
                    const idNum = (item.identity_number || '').toLowerCase();
                    const objName = (item.tax_object_name || '').toLowerCase();
                    const objCode = (item.tax_object_code || '').toLowerCase();
                    return name.includes(query) || idNum.includes(query) || objName.includes(query) || objCode.includes(query);
                }).map(item => ({
                    id: `TAXOBJ-${item.id}`,
                    title: `Wajib Pajak: ${item.name}`,
                    type: 'tax_object',
                    size: `${item.id_type}: ${item.identity_number}`,
                    uploadDate: item.created_at,
                    folderId: 'TAX_OBJECT',
                    folderName: 'Database WP',
                    score: 0.6,
                    matchType: 'tax_object',
                    data: item
                }));
            } catch { return []; }
        })();

        // 6. Search Pustaka (Guides & Slides)
        const pustakaPromise = (async () => {
            try {
                const rows = await knex('pustaka_guides as g')
                    .select('g.*', 's.title as slideTitle', 's.content as slideContent')
                    .leftJoin('pustaka_slides as s', 'g.id', 's.guide_id');

                const groups = {};
                rows.forEach(row => {
                    if (!groups[row.id]) groups[row.id] = { ...row, searchableContent: (row.title + " " + (row.description || "")).toLowerCase() };
                    if (row.slideTitle) groups[row.id].searchableContent += ` ${row.slideTitle.toLowerCase()} ${row.slideContent.toLowerCase()}`;
                });
                return Object.values(groups).filter(g => g.searchableContent.includes(query)).map(g => ({
                    id: `PUSTAKA-${g.id}`,
                    title: `Pustaka: ${g.title}`,
                    type: 'pustaka',
                    size: g.category,
                    uploadDate: g.created_at,
                    folderId: 'PUSTAKA',
                    folderName: 'Pustaka Pengetahuan',
                    score: 0.5,
                    matchType: 'pustaka',
                    ocrContent: g.description,
                    data: g
                }));
            } catch { return []; }
        })();

        // 7. Search Approvals
        const approvalPromise = (async () => {
            try {
                const rows = await knex('document_approvals');
                return (rows || []).filter(a => (a.title || '').toLowerCase().includes(query) || (a.description || '').toLowerCase().includes(query))
                    .map(a => ({
                        id: `APP-${a.id}`,
                        title: `Approval: ${a.title}`,
                        type: 'approval',
                        size: a.division,
                        uploadDate: a.created_at,
                        folderId: 'APPROVAL',
                        folderName: 'Document Approval',
                        score: 0.5,
                        matchType: 'approval',
                        data: a
                    }));
            } catch { return []; }
        })();

        // 8. Search Chat History / Notes
        const notePromise = (async () => {
            try {
                const rows = await knex('tax_audit_notes as n')
                    .select('n.*', 'a.title as auditTitle')
                    .leftJoin('tax_audits as a', 'n.auditId', 'a.id');

                return (rows || []).filter(n => (n.text || '').toLowerCase().includes(query))
                    .map(n => ({
                        id: `NOTE-${n.id}`,
                        title: `Catatan: ${n.user}`,
                        type: 'note',
                        size: 'Chat History',
                        uploadDate: n.timestamp,
                        folderId: 'NOTE',
                        folderName: n.auditTitle || 'Diskusi',
                        score: 0.4,
                        matchType: 'note',
                        ocrContent: n.text,
                        parentId: n.auditId,
                        parentType: 'audit',
                        data: n
                    }));
            } catch { return []; }
        })();

        const [docs, invs, exts, taxSums, taxObjs, pustakas, apps, notes] = await Promise.all([
            docPromise, invPromise, extPromise, taxSumPromise, taxObjPromise, pustakaPromise, approvalPromise, notePromise
        ]);

        const allResults = [...docs, ...invs, ...exts, ...taxSums, ...taxObjs, ...pustakas, ...apps, ...notes].sort((a, b) => b.score - a.score);
        res.json(allResults.slice(0, 50));
    } catch (err) {
        console.error("Search Error:", err);
        res.status(500).json({ error: "Search failed" });
    }
});


// Helper: Process Inventory Object to Extract Files
function processInventoryFiles(dataObj, contextId) {
    if (!dataObj || !dataObj.ordners) return dataObj;

    dataObj.ordners.forEach(ord => {
        if (ord.invoices && Array.isArray(ord.invoices)) {
            ord.invoices.forEach(inv => {
                if (inv.file && typeof inv.file === 'string' && inv.file.startsWith('data:')) {
                    console.warn(`[Inventory] Legacy Base64 detected for invoice ${inv.id}, ignoring in processInventoryFiles (should be handled by Multer or pre-uploaded)`);
                } else if (inv.file && (inv.file.startsWith('/uploads/') || inv.file.startsWith('http')) && (!inv.ocrContent || inv.ocrContent.length < 5)) {
                    // Extract relative path if it's a full URL
                    let relativePath = inv.file;
                    if (inv.file.startsWith('http')) {
                        try {
                            const urlObj = new URL(inv.file);
                            relativePath = urlObj.pathname;
                        } catch (e) { relativePath = inv.file; }
                    }

                    // Auto-detect fileType from extension if missing
                    let type = inv.fileType;
                    if (!type) {
                        const ext = path.extname(inv.fileName || relativePath).toLowerCase();
                        if (['.jpg', '.jpeg', '.png', '.bmp', '.webp'].includes(ext)) type = 'image/jpeg';
                        else if (['.pdf'].includes(ext)) type = 'application/pdf';
                        else if (['.docx', '.doc'].includes(ext)) type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                        else if (['.xlsx', '.xls'].includes(ext)) type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    }

                    // Only queue if we have a valid path starting with /uploads/
                    if (relativePath.startsWith('/uploads/')) {
                        const absolutePath = path.join(UPLOADS_DIR, path.basename(relativePath));
                        addOCRJob(contextId, absolutePath, type || 'application/pdf', inv.fileName, {
                            type: 'inventory',
                            slotId: contextId,
                            ordnerId: ord.id,
                            invoiceId: inv.id
                        }).catch(e => console.error("Inventory OCR Queue Error (Retry):", e));
                    }
                }
            });
        }
    });
    return dataObj;
}

// INCREASE MYSQL PACKET SIZE
knex.raw("SET GLOBAL max_allowed_packet = 67108864")
    .then(() => console.log("MySQL Config: max_allowed_packet set to 64MB for large uploads"))
    .catch(err => console.error("Warning: Failed to set max_allowed_packet:", err.message));

// --- USERS ---
// --- AUTH HANDLERS ---
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await knex('users').where('username', username).first();

        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        let match = false;
        if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
            match = await bcrypt.compare(password, user.password);
        } else {
            match = (user.password === password);
            if (match) {
                try {
                    const hashedPassword = await bcrypt.hash(password, 10);
                    await knex('users').where('id', user.id).update({ password: hashedPassword });
                    console.log(`[Auth] Auto-migrated password for user: ${user.username}`);
                } catch (hashErr) {
                    console.error("[Auth] Auto-hash migration error:", hashErr);
                }
            }
        }

        if (match) {
            const { password: _, ...userWithoutPass } = user;
            res.json(userWithoutPass);
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const rows = await knex('users').select('id', 'username', 'name', 'role', 'department');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { username, password, name, role, department } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const [id] = await knex('users').insert({
            username,
            password: hashedPassword,
            name,
            role,
            department
        });
        res.json({ id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { username, password, name, role, department } = req.body;
        const userId = req.params.id;

        await knex.transaction(async trx => {
            const oldUser = await trx('users').where('id', userId).first();
            if (!oldUser) throw new Error("User not found");

            let newPassword = password;
            if (password && password !== oldUser.password && !password.startsWith('$2b$')) {
                newPassword = await bcrypt.hash(password, 10);
            }

            await trx('users').where('id', userId).update({
                username,
                password: newPassword,
                name,
                role,
                department
            });

            const changes = [];
            if (oldUser.username !== username) changes.push(`Username: ${oldUser.username} -> ${username}`);
            if (oldUser.role !== role) changes.push(`Role: ${oldUser.role} -> ${role}`);
            if (oldUser.department !== department) changes.push(`Dept: ${oldUser.department} -> ${department}`);

            if (changes.length > 0) {
                await systemLog(null, "Update User", `Update User: ${name}`, JSON.stringify(oldUser), JSON.stringify({ username, password: '***', name, role, department }));
            }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/profile/:id', async (req, res) => {
    try {
        const { name, currentPassword, newPassword } = req.body;
        const userId = req.params.id;

        await knex.transaction(async trx => {
            const user = await trx('users').where('id', userId).first();
            if (!user) throw new Error("User not found");

            if (newPassword) {
                const match = await bcrypt.compare(currentPassword, user.password);
                if (!match) throw new Error("Password saat ini salah");
            }

            const updatedName = name || user.name;
            let updatedPassword = user.password;
            if (newPassword) {
                updatedPassword = await bcrypt.hash(newPassword, 10);
            }

            await trx('users').where('id', userId).update({
                name: updatedName,
                password: updatedPassword
            });

            await systemLog(user.name, "Update Profile", `User ${user.username} updated their profile`, JSON.stringify({ name: user.name, password: '***' }), JSON.stringify({ name: updatedName, password: '***' }));

            res.json({
                success: true,
                user: {
                    ...user,
                    name: updatedName,
                    password: updatedPassword
                }
            });
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await knex('users').where('id', req.params.id).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- DEPARTMENTS ---
app.get('/api/departments', async (req, res) => {
    try {
        const rows = await knex('departments');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/departments', async (req, res) => {
    try {
        const [id] = await knex('departments').insert({ name: req.body.name });
        res.json({ id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/departments/:id', async (req, res) => {
    try {
        const newName = req.body.name;
        const deptId = req.params.id;

        await knex.transaction(async trx => {
            const oldDept = await trx('departments').where('id', deptId).first();
            await trx('departments').where('id', deptId).update({ name: newName });

            if (oldDept && oldDept.name !== newName) {
                await systemLog(null, "Update Department", `Department ID ${deptId} name changed: ${oldDept.name} -> ${newName}`, oldDept.name, newName);
            }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/departments/:id', async (req, res) => {
    try {
        await knex('departments').where('id', req.params.id).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ROLES ---
app.get('/api/roles', async (req, res) => {
    try {
        const rows = await knex('roles');
        res.json(rows.map(r => ({
            id: r.id,
            name: r.label,
            permissions: JSON.parse(r.access)
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/roles', async (req, res) => {
    try {
        const { name, permissions } = req.body;
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        await knex('roles').insert({
            id,
            label: name,
            access: JSON.stringify(permissions)
        });
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/roles/:id', async (req, res) => {
    try {
        const { name, permissions } = req.body;
        const newPermissionsJson = JSON.stringify(permissions);
        const roleId = req.params.id;

        await knex.transaction(async trx => {
            const oldRole = await trx('roles').where('id', roleId).first();
            await trx('roles').where('id', roleId).update({
                label: name,
                access: newPermissionsJson
            });

            if (oldRole) {
                const changes = [];
                if (oldRole.label !== name) changes.push(`Name: ${oldRole.label} -> ${name}`);
                if (oldRole.access !== newPermissionsJson) changes.push(`Permissions changed`);

                if (changes.length > 0) {
                    await systemLog(null, "Update Role", `Role ID ${roleId} updated: ${changes.join(', ')}`, JSON.stringify(oldRole), JSON.stringify({ id: roleId, name, permissions }));
                }
            }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/roles/:id', async (req, res) => {
    try {
        await knex('roles').where('id', req.params.id).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- OCR STATUS API ---
app.get('/api/ocr/status', async (req, res) => {
    try {
        const counts = await ocrQueue.getJobCounts('active', 'waiting', 'completed', 'failed');
        const queue = await ocrQueue.getJobs(['active', 'waiting'], 0, 20, true); // Get top 20 active/waiting jobs

        const activeDetails = queue.map(job => ({
            id: job.id,
            filename: job.data.originalName || 'Unknown File',
            status: job.status,
            progress: job.progress || 0,
            type: job.data.context?.type === 'inventory' ? 'Inventory' : 'Document'
        }));

        res.json({
            counts,
            activeJobs: activeDetails // Keep key 'activeJobs' for frontend compatibility, but it now includes waiting
        });
    } catch (error) {
        console.error("OCR Status Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// NEW: Reset OCR Queue Endpoint (Fix Stuck Jobs)
app.post('/api/ocr/reset', async (req, res) => {
    try {
        await knex('job_queue').where('status', 'active').update({ status: 'waiting' });
        res.json({ success: true, message: "Queue reset successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- INVENTORY ---
app.get('/api/inventory', async (req, res) => {
    try {
        const rows = await knex('inventory').orderBy('id', 'asc');
        const rowMap = {};
        (rows || []).forEach(r => { rowMap[r.id] = r; });

        const fullInventory = [];
        for (let i = 1; i <= 100; i++) {
            if (rowMap[i]) {
                const r = rowMap[i];
                const rawBoxData = r.box_data || r.boxData || r.boxdata;
                const historyStr = r.history || '[]';
                const rawLastUpdated = r.lastUpdated || r.last_updated || r.lastupdated;

                let parsedBoxData = null;
                if (rawBoxData) {
                    try {
                        parsedBoxData = typeof rawBoxData === 'string' ? JSON.parse(rawBoxData) : rawBoxData;
                    } catch (e) { parsedBoxData = null; }
                }

                let parsedHistory = [];
                try {
                    parsedHistory = typeof historyStr === 'string' ? JSON.parse(historyStr) : historyStr;
                    if (!Array.isArray(parsedHistory)) parsedHistory = [];
                } catch (e) { parsedHistory = []; }

                fullInventory.push({
                    ...r,
                    id: i,
                    status: (r.status || 'EMPTY').toUpperCase(),
                    lastUpdated: rawLastUpdated,
                    boxData: parsedBoxData,
                    history: parsedHistory
                });
            } else {
                fullInventory.push({ id: i, status: 'EMPTY', boxData: null, history: [], lastUpdated: null });
            }
        }
        res.json(fullInventory);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- INVENTORY ANALYTICS (PREDICTION) ---
app.get('/api/inventory/analytics', async (req, res) => {
    try {
        const rows = await knex('logs')
            .select('details as location')
            .count('* as frequency')
            .max('timestamp as last_access')
            .whereIn('action', ['RETRIEVE', 'BORROW', 'MOVE'])
            .groupBy('details')
            .orderBy('frequency', 'desc')
            .limit(10);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/inventory/move', async (req, res) => {
    try {
        const { sourceId, targetId, user } = req.body;

        await knex.transaction(async trx => {
            const source = await trx('inventory').where('id', sourceId).first();
            if (!source) throw new Error("Source slot not found");
            if (source.status === 'EMPTY') throw new Error("Source slot is empty");

            const target = await trx('inventory').where('id', targetId).first();
            if (!target) throw new Error("Target slot not found");
            if (target.status !== 'EMPTY') throw new Error("Target slot is not empty");

            const now = new Date().toISOString();
            let sourceHistory = [];
            let targetHistory = [];
            try { sourceHistory = JSON.parse(source.history || '[]'); } catch (e) { }
            try { targetHistory = JSON.parse(target.history || '[]'); } catch (e) { }

            sourceHistory.push({
                id: Date.now(),
                timestamp: now,
                action: 'MOVED',
                note: `Pindah ke Slot #${targetId}`,
                user: user || 'System'
            });

            targetHistory.push({
                id: Date.now() + 1,
                timestamp: now,
                action: 'MOVED',
                note: `Pindahan dr Slot #${sourceId}`,
                user: user || 'System'
            });

            const boxData = source.box_data || source.boxData;

            await trx('inventory').where('id', targetId).update({
                status: source.status,
                box_data: boxData,
                history: JSON.stringify(targetHistory),
                lastUpdated: now
            });

            await trx('inventory').where('id', sourceId).update({
                status: 'EMPTY',
                box_data: null,
                history: JSON.stringify(sourceHistory),
                lastUpdated: now
            });

            await trx('boxes').where('inventory_id', sourceId).update({ inventory_id: targetId });
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/inventory/:id', async (req, res) => {
    try {
        let { status, lastUpdated, boxData, history, box_data } = req.body;
        status = (status || 'EMPTY').toUpperCase();
        const slotId = req.params.id;

        // 1. Parse & Process Files to Disk
        let dataObj = null;
        try {
            const raw = box_data !== undefined ? box_data : boxData;
            dataObj = typeof raw === 'string' ? JSON.parse(raw) : raw;
            dataObj = processInventoryFiles(dataObj, slotId);
        } catch (e) { console.error("Error processing inventory files:", e); }

        // 2. Prepare for DB
        const boxDataToSave = dataObj ? JSON.stringify(dataObj) : null;
        const historyJson = JSON.stringify(history || []);

        await knex.transaction(async trx => {
            // Primary Update
            await trx('inventory').where('id', slotId).update({
                status,
                lastUpdated,
                box_data: boxDataToSave,
                history: historyJson
            });

            // SYNC TO RELATIONAL TABLES
            await trx('boxes').where('inventory_id', slotId).del();
            await trx('inventory_items').where('inventory_id', slotId).del();

            if (dataObj && dataObj.id) {
                const [boxRefId] = await trx('boxes').insert({
                    inventory_id: slotId,
                    box_id: dataObj.id
                });

                if (dataObj.ordners && Array.isArray(dataObj.ordners)) {
                    for (const ord of dataObj.ordners) {
                        const [ordnerRefId] = await trx('ordners').insert({
                            box_ref_id: boxRefId,
                            no_ordner: ord.noOrdner || '',
                            period: ord.period || ''
                        });

                        if (ord.invoices && Array.isArray(ord.invoices)) {
                            for (const inv of ord.invoices) {
                                const invoiceNo = inv.invoiceNo || '';
                                const vendor = inv.vendor || '';
                                const paymentDate = inv.paymentDate || null;
                                const fileUrl = inv.file || '';
                                const fileName = inv.fileName || '';
                                const ocrContent = typeof inv.ocrContent === 'string' ? inv.ocrContent : JSON.stringify(inv.ocrContent || '');

                                await trx('invoices').insert({
                                    ordner_ref_id: ordnerRefId,
                                    invoice_no: invoiceNo,
                                    vendor: vendor,
                                    payment_date: paymentDate,
                                    file_url: fileUrl,
                                    file_name: fileName,
                                    ocr_content: ocrContent
                                });

                                const amount = inv.totalAmount ? parseFloat(String(inv.totalAmount).replace(/[^0-9.-]+/g, "")) : 0;
                                await trx('inventory_items').insert({
                                    inventory_id: slotId,
                                    box_id: dataObj.id,
                                    ordner_id: ord.no_ordner || ord.noOrdner,
                                    invoice_no: invoiceNo,
                                    vendor: vendor,
                                    date: paymentDate,
                                    amount: amount,
                                    file_url: fileUrl,
                                    ocr_content: ocrContent
                                });
                            }
                        }
                    }
                }
            }
        });

        await systemLog(req.body.modifiedBy || "System", "Update Inventory", `Update slot ${slotId}`);
        res.json({ success: true, id: slotId });
    } catch (err) {
        console.error("Critical Error in Inventory Update:", err);
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/inventory/external', async (req, res) => {
    try {
        const rows = await knex('external_items').orderBy('sentDate', 'desc');
        res.json((rows || []).map(r => {
            let boxData = null;
            let history = [];
            try { boxData = r.boxData ? JSON.parse(r.boxData) : null; } catch (e) { }
            try { history = r.history ? JSON.parse(r.history) : []; } catch (e) { }
            return {
                ...r,
                boxData,
                box_data: boxData,
                history
            };
        }));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/inventory/external', async (req, res) => {
    try {
        let { boxId, destination, sentDate, sender, boxData, history } = req.body;
        if (boxData) {
            boxData = processInventoryFiles(boxData, 'EXT-' + boxId);
        }

        const [id] = await knex('external_items').insert({
            boxId,
            destination,
            sentDate,
            sender,
            boxData: JSON.stringify(boxData),
            history: JSON.stringify(history)
        });
        res.json({ success: true, id: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/inventory/external/:id', async (req, res) => {
    try {
        await knex('external_items').where('id', req.params.id).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- NORMALIZED QUERY ENDPOINTS ---

// Search invoices with filters (vendor, invoice_no, period)
app.get('/api/invoices', async (req, res) => {
    try {
        const { vendor, invoice_no, period, limit = 100, offset = 0 } = req.query;

        let query = knex('invoices as i')
            .select('i.*', 'o.no_ordner', 'o.period', 'b.box_id', 'b.inventory_id')
            .join('ordners as o', 'i.ordner_ref_id', 'o.id')
            .join('boxes as b', 'o.box_ref_id', 'b.id');

        if (vendor) query = query.where('i.vendor', 'like', `%${vendor}%`);
        if (invoice_no) query = query.where('i.invoice_no', 'like', `%${invoice_no}%`);
        if (period) query = query.where('o.period', 'like', `%${period}%`);

        const rows = await query.orderBy('i.id', 'desc').limit(parseInt(limit)).offset(parseInt(offset));
        res.json(rows || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- STATS ---
app.get('/api/stats', async (req, res) => {
    try {
        const [totalInvoices] = await knex('invoices').count('* as count');
        const [totalValue] = await knex('invoices').sum('total_amount as sum');
        const [boxCount] = await knex('boxes').count('* as count');
        const [inventoryCount] = await knex('inventory').whereNot('status', 'EMPTY').count('* as count');

        const monthlyStats = await knex('invoices')
            .select(knex.raw('strftime("%Y-%m", payment_date) as month'))
            .count('* as count')
            .sum('total_amount as total')
            .groupBy('month')
            .orderBy('month', 'desc')
            .limit(6);

        res.json({
            totalInvoices: totalInvoices.count,
            totalValue: totalValue.sum || 0,
            boxCount: boxCount.count,
            inventoryUsage: inventoryCount.count,
            monthlyStats
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Aggregate stats for invoices
app.get('/api/invoices/stats', async (req, res) => {
    try {
        const [stats] = await knex('invoices as i')
            .select(
                knex.raw('COUNT(*) as total_invoices'),
                knex.raw('COUNT(DISTINCT b.box_id) as total_boxes'),
                knex.raw('COUNT(DISTINCT o.id) as total_ordners')
            )
            .join('ordners as o', 'i.ordner_ref_id', 'o.id')
            .join('boxes as b', 'o.box_ref_id', 'b.id');

        const topVendors = await knex('invoices')
            .select('vendor')
            .count('* as count')
            .where('vendor', '!=', '')
            .groupBy('vendor')
            .orderBy('count', 'desc')
            .limit(10);

        const byPeriod = await knex('invoices as i')
            .select('o.period')
            .count('* as count')
            .join('ordners as o', 'i.ordner_ref_id', 'o.id')
            .where('o.period', '!=', '')
            .groupBy('o.period')
            .orderBy('count', 'desc')
            .limit(12);

        res.json({
            ...stats,
            top_vendors: topVendors || [],
            by_period: byPeriod || []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SYSTEM LOGS ---
app.get('/api/system/logs', async (req, res) => {
    try {
        const rows = await knex('logs').orderBy('timestamp', 'desc').limit(500);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/system/log', async (req, res) => {
    try {
        const { user, action, details, oldValue, newValue } = req.body;
        await systemLog(user, action, details, oldValue, newValue);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- LOGGING HELPER ---
const systemLog = async (user, action, details, oldValue = null, newValue = null) => {
    try {
        const timestamp = new Date().toISOString();
        await knex('logs').insert({
            timestamp,
            user: user || 'System',
            action,
            details,
            oldValue: oldValue ? JSON.stringify(oldValue) : null,
            newValue: newValue ? JSON.stringify(newValue) : null
        });
    } catch (err) {
        console.error("Logging failed:", err);
    }
};

app.post('/api/logs', (req, res) => {
    const { user, action, details, oldValue, newValue } = req.body;
    const timestamp = new Date().toISOString();
    db.run("INSERT INTO logs (timestamp, user, action, details, oldValue, newValue) VALUES (?, ?, ?, ?, ?, ?)",
        [timestamp, user, action, details, oldValue, newValue],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// --- FOLDERS ---
app.get('/api/folders', async (req, res) => {
    try {
        const rows = await knex('folders').orderBy('id', 'asc');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/folders', async (req, res) => {
    try {
        const { name, parentId, type, color } = req.body;
        const [id] = await knex('folders').insert({
            name,
            parentId: parentId || null,
            type: type || 'folder',
            color: color || '#2563eb'
        });
        res.json({ id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/folders/:id', async (req, res) => {
    try {
        const { name, color } = req.body;
        await knex('folders').where('id', req.params.id).update({ name, color });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/folders/:id', async (req, res) => {
    try {
        const folderId = req.params.id;
        await knex.transaction(async trx => {
            const folder = await trx('folders').where('id', folderId).first();
            if (!folder) throw new Error("Folder not found");

            await trx('documents').where('folderId', folderId).update({ folderId: null });
            await trx('folders').where('id', folderId).del();
            await systemLog(null, "Delete Folder", `Folder deleted: ${folder.name}`);
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- DOCUMENTS ---
app.get('/api/documents', async (req, res) => {
    try {
        const { auditId, stepIndex, folderId } = req.query;
        let query = knex('documents')
            .select('id', 'title', 'type', 'size', 'uploadDate', 'url', 'folderId', 'department', 'owner', 'ocrContent', 'auditId', 'stepIndex', 'status', 'version', 'versionsHistory')
            .orderBy('uploadDate', 'desc');

        if (auditId) {
            query = query.where('auditId', auditId);
        }

        const normalizedFolderId = (folderId === "null" || folderId === "") ? null : folderId;
        if (folderId !== undefined) {
            if (normalizedFolderId) {
                query = query.where('folderId', normalizedFolderId);
            } else {
                query = query.whereNull('folderId');
            }
        }

        if (stepIndex !== undefined) {
            query = query.where('stepIndex', stepIndex);
        }

        const rows = await query;
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/documents/public', async (req, res) => {
    try {
        const rows = await knex('documents').where('isPublic', 1).orderBy('uploadDate', 'desc');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/documents/:id', async (req, res) => {
    try {
        const doc = await knex('documents').where('id', req.params.id).first();
        if (!doc) return res.status(404).json({ error: "Document not found" });
        res.json(doc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// --- OCR HELPER ---
// --- OCR HELPER ---
const extractTextFromFile = async (buffer, mimeType) => {
    try {
        if (!buffer) return '';

        // 1. Image OCR (Tesseract)
        if (mimeType.startsWith('image/')) {
            console.log("Starting OCR for Image...");
            const { data: { text } } = await Tesseract.recognize(buffer, 'eng+ind', {
                logger: m => { if (m.status === 'recognizing text') console.log(`OCR Progress: ${(m.progress * 100).toFixed(0)}%`); }
            });
            return text;
        }

        // 2. PDF Text Extraction (pdf-parse)
        if (mimeType === 'application/pdf') {
            console.log("Starting PDF Text Extraction...");
            let parse = pdfParse;
            // Handle ESM/CommonJS default export mismatch
            if (typeof parse !== 'function' && parse.default) {
                parse = parse.default;
            }
            if (typeof parse !== 'function') {
                console.error("pdf-parse is not a function", parse);
                return "";
            }
            const data = await parse(buffer);
            return data.text;
        }

        // 3. Word Document (.docx) (mammoth)
        if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            console.log("Starting DOCX Text Extraction...");
            const result = await mammoth.extractRawText({ buffer: buffer });
            return result.value; // The raw text
        }

        // 4. Excel Spreadsheet (.xlsx) (xlsx)
        if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
            console.log("Starting XLSX Text Extraction...");
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            let allText = "";
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const text = XLSX.utils.sheet_to_txt(sheet);
                allText += `\n--- Sheet: ${sheetName} ---\n${text}`;
            });
            return allText;
        }

        return '';
    } catch (e) {
        console.error("OCR/Text Extraction Failed:", e);
        return '';
    }
};

// ... (existing code)

app.post('/api/documents', async (req, res) => {
    try {
        const { title, type, size, uploadDate, folderId, owner, ocrContent, isPublic } = req.body;
        const [id] = await knex('documents').insert({
            title,
            type,
            size,
            uploadDate,
            folderId: folderId || null,
            owner,
            ocrContent,
            isPublic: isPublic ? 1 : 0
        });

        const doc = await knex('documents').where('id', id).first();
        await systemLog(owner, "Document", `Upload dokumen: "${title}"`);
        res.json({ success: true, id, document: doc });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { folderId, owner, isPublic } = req.body;
        const title = req.body.title || req.file.originalname;
        const type = req.file.mimetype;
        const size = (req.file.size / 1024).toFixed(1) + ' KB';
        const uploadDate = new Date().toISOString();

        // --- AUTOMATIC REVISION CHECK ---
        const normalizedFolderId = (folderId === "null" || folderId === "" || !folderId) ? null : folderId;
        const existingDoc = await knex('documents')
            .where('title', title)
            .andWhere(function () {
                if (normalizedFolderId) {
                    this.where('folderId', normalizedFolderId);
                } else {
                    this.whereNull('folderId');
                }
            })
            .first();

        if (existingDoc) {
            console.log(`Duplicate found: ${title} in folder ${folderId || 'Root'}. Creating revision for ID: ${existingDoc.id}`);

            let versionsHistory = [];
            try { versionsHistory = existingDoc.versionsHistory ? JSON.parse(existingDoc.versionsHistory) : []; } catch (e) { }

            // Archive current version
            let archivedUrl = existingDoc.url;
            if (existingDoc.url && existingDoc.url.startsWith('/uploads/')) {
                const ext = existingDoc.title.split('.').pop() || 'bin';
                const filename = `ARCHIVE-${existingDoc.id}-${Date.now()}.${ext}`;
                const newFilePath = path.join(UPLOADS_DIR, filename);
                const oldFilePath = path.join(UPLOADS_DIR, path.basename(existingDoc.url));
                try {
                    if (fs.existsSync(oldFilePath)) {
                        fs.copyFileSync(oldFilePath, newFilePath);
                        archivedUrl = `/uploads/${filename}`;
                    }
                } catch (e) { console.error("Archiving failed:", e); }
            } else if (existingDoc.fileData && existingDoc.fileData.startsWith('data:')) {
                const ext = (existingDoc.title || '').split('.').pop() || 'bin';
                try {
                    const matches = existingDoc.fileData.match(/^data:([A-Za-z0-9-+\/.]+);base64,(.+)$/);
                    if (matches && matches.length === 3) {
                        const buffer = Buffer.from(matches[2], 'base64');
                        const filename = `ARCHIVE-${existingDoc.id}-${Date.now()}.${ext}`;
                        const filePath = path.join(UPLOADS_DIR, filename);
                        fs.writeFileSync(filePath, buffer);
                        archivedUrl = `/uploads/${filename}`;
                    }
                } catch (e) { console.error("Legacy archiving failed:", e); }
            }

            versionsHistory.push({
                timestamp: existingDoc.uploadDate || new Date().toISOString(),
                size: existingDoc.size,
                type: existingDoc.type,
                fileData: null,
                url: archivedUrl,
                title: existingDoc.title,
                user: existingDoc.owner || 'System'
            });

            const fileUrl = `/uploads/${req.file.filename}`;
            const absoluteFilePath = req.file.path;
            const finalType = req.file.mimetype;
            const finalSize = (req.file.size / 1024 / 1024).toFixed(2) + ' MB';
            const initialOcr = req.body.ocrContent || '';
            const status = initialOcr ? 'done' : 'processing';

            await knex('documents')
                .where('id', existingDoc.id)
                .update({
                    title: title,
                    type: finalType,
                    size: finalSize,
                    uploadDate: uploadDate,
                    url: fileUrl,
                    ocrContent: initialOcr,
                    fileData: null,
                    versionsHistory: JSON.stringify(versionsHistory),
                    version: knex.raw('COALESCE(version, 1) + 1'),
                    status: status
                });

            if (absoluteFilePath) {
                try {
                    await addOCRJob(existingDoc.id, absoluteFilePath, finalType || 'application/octet-stream', title);
                } catch (qErr) { console.error("Queue Error:", qErr); }
            }

            await systemLog(owner, "Revisi", `Otomatis membuat revisi: "${title}" v${existingDoc.version + 1}`);
            return res.json({ success: true, id: existingDoc.id, version: existingDoc.version + 1, isRevision: true });
        }

        // --- ORIGINAL INSERT LOGIC ---
        const fileUrl = `/uploads/${req.file.filename}`;
        const absoluteFilePath = req.file.path;
        const finalType = req.file.mimetype;
        const finalSize = (req.file.size / 1024 / 1024).toFixed(2) + ' MB';

        const initialOcr = req.body.ocrContent || '';
        const status = initialOcr ? 'done' : 'processing';

        const [id] = await knex('documents').insert({
            title: title,
            type: finalType,
            size: finalSize,
            uploadDate: uploadDate,
            url: fileUrl,
            folderId: normalizedFolderId,
            department: req.body.department || null,
            owner: owner || 'System',
            ocrContent: initialOcr,
            auditId: req.body.auditId || null,
            stepIndex: req.body.stepIndex || null,
            fileData: null,
            status: status,
            isPublic: isPublic === 'true' ? 1 : 0
        });

        if (absoluteFilePath) {
            try {
                await addOCRJob(id, absoluteFilePath, finalType || 'application/octet-stream', title);
            } catch (qErr) {
                console.error("Queue Error:", qErr);
            }
        }

        await systemLog(owner, "Upload", `Mengunggah dokumen (Queued): "${title}"`);

        res.json({
            id, title, type: finalType, size: finalSize, uploadDate, url: fileUrl, folderId, department: req.body.department, owner,
            ocrContent: initialOcr, auditId: req.body.auditId, stepIndex: req.body.stepIndex, status: 'processing'
        });
    } catch (err) {
        console.error("DB INSERT ERROR:", err.message);
        res.status(500).json({ error: "Database Insert Failed: " + err.message });
    }
});

app.put('/api/documents/:id', upload.single('file'), async (req, res) => {
    try {
        const { title, folderId, isPublic, ocrContent, versionsHistory: historyInput } = req.body;
        const subId = req.params.id;

        await knex.transaction(async trx => {
            const existing = await trx('documents').where('id', subId).first();
            if (!existing) throw new Error("Document not found");

            let versionsHistory = [];
            try {
                versionsHistory = typeof historyInput === 'string' ? JSON.parse(historyInput) : (historyInput || []);
            } catch (e) {
                versionsHistory = existing.versionsHistory ? JSON.parse(existing.versionsHistory) : [];
            }

            const now = new Date().toISOString();
            const currentVersion = existing.version || 1;

            versionsHistory.push({
                id: Date.now(),
                version: currentVersion,
                timestamp: now,
                url: existing.url,
                title: existing.title,
                size: existing.size,
                user: req.body.owner || 'System'
            });

            const updateData = {
                title: title || existing.title,
                folderId: (folderId === "null" || folderId === "" || !folderId) ? null : folderId,
                isPublic: isPublic === 'true' || isPublic === true || isPublic === 1 ? 1 : 0,
                ocrContent: ocrContent || existing.ocrContent,
                uploadDate: now,
                version: currentVersion + 1,
                versionsHistory: JSON.stringify(versionsHistory)
            };

            if (req.file) {
                updateData.url = `/uploads/${req.file.filename}`;
                updateData.size = (req.file.size / 1024 / 1024).toFixed(2) + ' MB';
                updateData.status = 'processing';
                updateData.fileData = null;

                const absolutePath = path.resolve(req.file.path);
                addOCRJob(subId, absolutePath, req.file.mimetype, req.file.originalname)
                    .catch(e => console.error("OCR Queue Error (Revision):", e));
            }

            await trx('documents').where('id', subId).update(updateData);
            await systemLog(req.body.owner || "System", "Update Document", `Memperbarui dokumen ID ${subId} ke v${currentVersion + 1}`);
        });

        const updatedDoc = await knex('documents').where('id', subId).first();
        res.json({ success: true, document: updatedDoc });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MANAGEMENT OPS (COPY/MOVE) ---
app.post('/api/documents/copy', (req, res) => {
    const { id, targetFolderId } = req.body;
    db.get("SELECT * FROM documents WHERE id = ?", [id], (err, doc) => {
        if (err || !doc) return res.status(500).json({ error: err ? err.message : "Document not found" });
        const newId = String(Date.now()) + "_" + Math.floor(Math.random() * 1000);
        const newDoc = { ...doc, id: newId, folderId: targetFolderId, title: "Copy of " + doc.title, uploadDate: new Date().toISOString() };
        db.run("INSERT INTO documents (id, title, type, size, uploadDate, url, folderId, department, owner, ocrContent, auditId, stepIndex, fileData) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)",
            [newDoc.id, newDoc.title, newDoc.type, newDoc.size, newDoc.uploadDate, newDoc.url, newDoc.folderId, newDoc.department, newDoc.owner, newDoc.ocrContent, newDoc.auditId, newDoc.stepIndex],
            async (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                await systemLog(newDoc.owner, "Copy", `Salin file: "${doc.title}" ke folder: ${targetFolderId || 'Root'}`);
                res.json({ success: true, id: newId });
            }
        );
    });
});

app.post('/api/documents/move', (req, res) => {
    const { id, targetFolderId } = req.body;
    db.run("UPDATE documents SET folderId = ? WHERE id = ?", [targetFolderId, id], async (err) => {
        if (err) return res.status(500).json({ error: err.message });
        await systemLog(null, "Move", `Pindah file ID: ${id} ke folder: ${targetFolderId || 'Root'}`);
        res.json({ success: true });
    });
});

app.post('/api/folders/move', (req, res) => {
    const { id, targetParentId } = req.body;
    if (String(id) === String(targetParentId)) return res.status(400).json({ error: "Cannot move folder into itself" });
    db.run("UPDATE folders SET parentId = ? WHERE id = ?", [targetParentId, id], async (err) => {
        if (err) return res.status(500).json({ error: err.message });
        await systemLog(null, "Move", `Pindah folder ID: ${id} ke folder: ${targetParentId || 'Root'}`);
        res.json({ success: true });
    });
});

// Recursive folder copy logic
async function recursiveCopyFolder(sourceId, targetParentId, db) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM folders WHERE id = ?", [sourceId], (err, folder) => {
            if (err || !folder) return reject(err || new Error("Folder not found"));

            const newFolderName = "Copy of " + folder.name;
            db.run("INSERT INTO folders (parentId, name, privacy, allowedDepts, allowedUsers, owner) VALUES (?, ?, ?, ?, ?, ?)",
                [targetParentId, newFolderName, folder.privacy, folder.allowedDepts, folder.allowedUsers, folder.owner],
                async function (err2) {
                    if (err2) return reject(err2);
                    const newFolderId = this.lastID;
                    await systemLog(folder.owner, "Copy", `Salin folder: "${folder.name}" ke folder: ${targetParentId || 'Root'}`);

                    // Copy files in this folder
                    db.all("SELECT * FROM documents WHERE folderId = ?", [sourceId], async (err3, docs) => {
                        if (err3) return reject(err3);
                        for (const doc of (docs || [])) {
                            const newDocId = String(Date.now()) + "_" + Math.floor(Math.random() * 1000);
                            await new Promise((resDoc, rejDoc) => {
                                db.run("INSERT INTO documents (id, title, type, size, uploadDate, url, folderId, department, owner, ocrContent, auditId, stepIndex) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                                    [newDocId, doc.title, doc.type, doc.size, new Date().toISOString(), doc.url, newFolderId, doc.department, doc.owner, doc.ocrContent, doc.auditId, doc.stepIndex],
                                    (e) => e ? rejDoc(e) : resDoc()
                                );
                            });
                        }

                        // Copy subfolders
                        db.all("SELECT id FROM folders WHERE parentId = ?", [sourceId], async (err4, subfolders) => {
                            if (err4) return reject(err4);
                            for (const sub of (subfolders || [])) {
                                await recursiveCopyFolder(sub.id, newFolderId, db);
                            }
                            resolve(newFolderId);
                        });
                    });
                }
            );
        });
    });
}

app.post('/api/folders/copy', async (req, res) => {
    const { id, targetParentId } = req.body;
    try {
        const newId = await recursiveCopyFolder(id, targetParentId, db);
        res.json({ success: true, id: newId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/documents/:id', async (req, res) => {
    try {
        const subId = req.params.id;
        const doc = await knex('documents').where('id', subId).first();
        if (!doc) return res.status(404).json({ error: "Document not found" });

        // Delete main file if exists on disk
        if (doc.url && doc.url.startsWith('/uploads/')) {
            const filePath = path.join(UPLOADS_DIR, path.basename(doc.url));
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // Sync is fine for delete
                console.log("Deleted file from disk:", filePath);
            }
        }

        await knex('documents').where('id', subId).del();
        await knex('job_queue').where('context_id', subId).del(); // Clean up any pending OCR jobs
        await systemLog(null, "Delete Document", `Menghapus dokumen: "${doc.title}"`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- REVISIONS ---
app.get('/api/documents/:id/revisions', async (req, res) => {
    try {
        const doc = await knex('documents').where('id', req.params.id).first();
        if (!doc) return res.status(404).json({ error: "Document not found" });
        const history = doc.versionsHistory ? JSON.parse(doc.versionsHistory) : [];
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/documents/:id/revisions', async (req, res) => {
    try {
        const { versionId, user } = req.body;
        const subId = req.params.id;

        await knex.transaction(async trx => {
            const doc = await trx('documents').where('id', subId).first();
            if (!doc) throw new Error("Document not found");

            const history = doc.versionsHistory ? JSON.parse(doc.versionsHistory) : [];
            const version = history.find(v => v.id == versionId);
            if (!version) throw new Error("Version not found");

            const now = new Date().toISOString();
            const currentVersion = doc.version || 1;

            // Archive current state before restoring
            const newHistory = history.filter(v => v.id != versionId); // Remove the version being restored from history
            newHistory.push({
                id: Date.now(),
                version: currentVersion,
                timestamp: doc.uploadDate || now,
                url: doc.url,
                title: doc.title,
                size: doc.size,
                type: doc.type,
                user: doc.owner || 'System'
            });

            // Update document with restored version data
            await trx('documents').where('id', subId).update({
                url: version.url,
                title: version.title,
                size: version.size,
                type: version.type,
                uploadDate: now,
                version: currentVersion + 1,
                versionsHistory: JSON.stringify(newHistory),
                status: 'processing', // Re-process OCR for restored file
                ocrContent: '', // Clear OCR content to force re-OCR
                fileData: null // Ensure fileData is null if using URL
            });

            // If the restored version has a file URL, add an OCR job
            if (version.url && version.url.startsWith('/uploads/')) {
                const absoluteFilePath = path.join(UPLOADS_DIR, path.basename(version.url));
                if (fs.existsSync(absoluteFilePath)) {
                    await addOCRJob(subId, absoluteFilePath, version.type || 'application/octet-stream', version.title);
                } else {
                    console.warn(`Restored file not found on disk: ${absoluteFilePath}. OCR job skipped.`);
                    await trx('documents').where('id', subId).update({ status: 'error', ocrContent: 'File not found for OCR' });
                }
            } else {
                await trx('documents').where('id', subId).update({ status: 'done' }); // No file to OCR
            }

            await systemLog(user, "Restore", `Restore dokumen "${doc.title}" ke versi ${version.version}`);
        });

        res.json({ success: true });
    } catch (err) {
        console.error("Error restoring document version:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- TAX AUDITS ---
app.get('/api/tax-audits', (req, res) => {
    db.all("SELECT * FROM tax_audits", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({ ...r, steps: JSON.parse(r.steps) })));
    });
});

app.post('/api/tax-audits', (req, res) => {
    const { id, title, status, currentStep, steps, letterNumber, startDate } = req.body;
    db.run("INSERT INTO tax_audits (id, title, status, currentStep, steps, letterNumber, startDate) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, title, status, currentStep, JSON.stringify(steps), letterNumber, startDate],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.put('/api/tax-audits/:id', (req, res) => {
    const { title, status, currentStep, steps, letterNumber, startDate } = req.body;
    db.run("UPDATE tax_audits SET title = ?, status = ?, currentStep = ?, steps = ?, letterNumber = ?, startDate = ? WHERE id = ?",
        [title, status, currentStep, JSON.stringify(steps), letterNumber, startDate, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/tax-audits/:id', (req, res) => {
    db.run("DELETE FROM tax_audits WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- TAX SUMMARIES ---
app.get('/api/tax-summaries', async (req, res) => {
    try {
        const rows = await knex('tax_summaries').orderBy('year', 'desc').orderBy('month', 'desc');
        res.json(rows.map(r => ({
            ...r,
            data: typeof r.data === 'string' ? JSON.parse(r.data || '{}') : (r.data || {})
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tax-summaries', async (req, res) => {
    try {
        const { month, year, pph21, pph23, pph25, pph4_2, ppn, status, data } = req.body;

        await knex.transaction(async trx => {
            const existing = await trx('tax_summaries').where({ month, year }).first();
            if (existing) {
                await trx('tax_summaries').where('id', existing.id).update({
                    pph21,
                    pph23,
                    pph25,
                    pph4_2,
                    ppn,
                    status,
                    data: JSON.stringify(data || {})
                });
            } else {
                await trx('tax_summaries').insert({
                    month,
                    year,
                    pph21,
                    pph23,
                    pph25,
                    pph4_2,
                    ppn,
                    status,
                    data: JSON.stringify(data || {})
                });
            }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tax-summaries/:id', async (req, res) => {
    try {
        const { type, month, year, pembetulan, data } = req.body;
        await knex('tax_summaries').where('id', req.params.id).update({
            type,
            month,
            year,
            pembetulan,
            data: JSON.stringify(data)
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tax-summaries/:id', async (req, res) => {
    try {
        await knex('tax_summaries').where('id', req.params.id).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- TAX OBJECTS (DATABASE WP) ---
// Table is created in db.js initDb()

app.get('/api/boxes', async (req, res) => {
    try {
        const rows = await knex('boxes as b')
            .select('b.*', 'i.status', 'i.lastUpdated')
            .join('inventory as i', 'b.inventory_id', 'i.id')
            .orderBy('b.box_id', 'asc');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/tax-objects', async (req, res) => {
    try {
        const rows = await knex('tax_objects').orderBy('created_at', 'desc');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tax-objects', async (req, res) => {
    try {
        const { idType, identityNumber, name, email, taxType, taxObjectCode, taxObjectName, dpp, rate, pph, ppn, totalPayable, discount, dppNet } = req.body;

        await knex.transaction(async trx => {
            const existing = await trx('tax_objects').where('identity_number', identityNumber).first();
            if (existing) {
                await trx('tax_objects').where('id', existing.id).update({
                    id_type: idType,
                    name,
                    email,
                    tax_type: taxType,
                    tax_object_code: taxObjectCode,
                    tax_object_name: taxObjectName,
                    dpp,
                    rate,
                    pph,
                    ppn,
                    total_payable: totalPayable,
                    discount,
                    dpp_net: dppNet
                });
            } else {
                await trx('tax_objects').insert({
                    id_type: idType,
                    identity_number: identityNumber,
                    name,
                    email,
                    tax_type: taxType,
                    tax_object_code: taxObjectCode,
                    tax_object_name: taxObjectName,
                    dpp,
                    rate,
                    pph,
                    ppn,
                    total_payable: totalPayable,
                    discount,
                    dpp_net: dppNet
                });
            }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.put('/api/tax-objects/:id', async (req, res) => {
    try {
        const { idType, identityNumber, name, email, taxType, taxObjectCode, taxObjectName, dpp, rate, pph, ppn, totalPayable, discount, dppNet } = req.body;
        await knex('tax_objects').where('id', req.params.id).update({
            id_type: idType,
            identity_number: identityNumber,
            name,
            email,
            tax_type: taxType,
            tax_object_code: taxObjectCode,
            tax_object_name: taxObjectName,
            dpp,
            rate,
            pph,
            ppn,
            total_payable: totalPayable,
            discount,
            dpp_net: dppNet
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tax-objects-all', async (req, res) => {
    try {
        await knex('tax_objects').del();
        res.json({ success: true, message: "Seluruh data database WP telah dihapus." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tax-objects/:id', async (req, res) => {
    try {
        await knex('tax_objects').where('id', req.params.id).del();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/tax-objects/export', (req, res) => {
    db.all("SELECT * FROM tax_objects ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Map data to Excel friendly format
        const exportData = rows.map(item => ({
            'Nama Wajib Pajak': item.name,
            'Jenis Pajak': `PPh ${item.tax_type}`,
            'Tarif (%)': item.rate,
            'NPWP/NIK': `${item.id_type}: ${item.identity_number}`,
            'Kode Objek Pajak': item.tax_object_code,
            'Email': item.email
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Adjust column widths
        ws['!cols'] = [
            { wch: 30 }, // Nama Wajib Pajak
            { wch: 15 }, // Jenis Pajak
            { wch: 10 }, // Tarif (%)
            { wch: 25 }, // NPWP/NIK
            { wch: 20 }, // Kode Objek Pajak
            { wch: 30 }  // Email
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Database WP');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Database_WP.xlsx');
        res.send(buffer);
    });
});

// --- NEW: TAX OBJECTS TEMPLATE & IMPORT ---

app.get('/api/tax-objects/template', (req, res) => {
    const wb = XLSX.utils.book_new();
    const wsData = [
        ['Jenis ID', 'Nomor Identitas', 'Nama Wajib Pajak', 'Email', 'Jenis PPh', 'Kode Objek', 'Nama Objek', 'DPP', 'Tarif (%)', 'Total PPh'],
        ['NPWP', '01.234.567.8-901.000', 'PT Contoh Sejahtera', 'admin@contoh.com', '23', '24-100-02', 'Jasa Teknik', 10000000, 2, 200000],
        ['KTP', '3201234567890001', 'Budi Santoso', 'budi@email.com', '21', '21-100-01', 'Upah Pegawai', 5000000, 5, 250000]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Adjust column widths
    ws['!cols'] = [
        { wch: 10 }, { wch: 25 }, { wch: 30 }, { wch: 10 },
        { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Template Database WP');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="Template_Database_WP.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

app.post('/api/tax-objects/import', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        if (!fs.existsSync(req.file.path)) {
            throw new Error(`File not found at path: ${req.file.path}`);
        }

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        db.all("SELECT id, identity_number, tax_type, tax_object_code FROM tax_objects", [], async (err, existingRows) => {
            if (err) {
                console.error("Import check error:", err);
                return res.status(500).json({ error: 'Gagal mengecek duplikat: ' + err.message });
            }

            const groupedData = {};
            data.forEach(row => {
                const idNumber = String(row['Nomor Identitas'] || '').trim();
                const taxType = String(row['Jenis PPh'] || '').trim();
                const code = String(row['Kode Objek'] || '').trim();
                if (!idNumber || !row['Nama Wajib Pajak']) return;

                const key = `${idNumber}|${taxType}|${code}`;
                if (!groupedData[key]) {
                    groupedData[key] = {
                        id_type: row['Jenis ID'] || 'NPWP',
                        identity_number: idNumber,
                        name: row['Nama Wajib Pajak'] || '',
                        email: row['Email'] || '',
                        tax_type: taxType,
                        tax_object_code: code,
                        tax_object_name: row['Nama Objek'] || '',
                        dpp: Number(row['DPP']) || 0,
                        rate: Number(row['Tarif (%)']) || 0,
                        pph: Number(row['Total PPh']) || 0
                    };
                } else {
                    groupedData[key].dpp += Number(row['DPP']) || 0;
                    groupedData[key].pph += Number(row['Total PPh']) || 0;
                }
            });

            const items = Object.values(groupedData);
            let updatedCount = 0;
            let insertedCount = 0;

            const runQuery = (sql, params) => new Promise((resolve, reject) => {
                db.run(sql, params, function (err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });

            try {
                for (const item of items) {
                    const exactMatch = existingRows.find(r =>
                        r.identity_number === item.identity_number &&
                        String(r.tax_type) === String(item.tax_type) &&
                        String(r.tax_object_code) === String(item.tax_object_code)
                    );

                    if (exactMatch) {
                        await runQuery(`UPDATE tax_objects SET name=?, email=?, tax_object_name=?, dpp=?, rate=?, pph=? WHERE id=?`,
                            [item.name, item.email, item.tax_object_name, item.dpp, item.rate, item.pph, exactMatch.id]);
                        updatedCount++;
                    } else {
                        const emptyMatch = existingRows.find(r =>
                            r.identity_number === item.identity_number &&
                            (!r.tax_type || r.tax_type === '' || !r.tax_object_code || r.tax_object_code === '')
                        );
                        if (emptyMatch) {
                            await runQuery(`UPDATE tax_objects SET tax_type=?, tax_object_code=?, tax_object_name=?, dpp=?, rate=?, pph=?, name=?, email=? WHERE id=?`,
                                [item.tax_type, item.tax_object_code, item.tax_object_name, item.dpp, item.rate, item.pph, item.name, item.email, emptyMatch.id]);
                            existingRows.splice(existingRows.indexOf(emptyMatch), 1);
                            updatedCount++;
                        } else {
                            await runQuery(`INSERT INTO tax_objects (id_type, identity_number, name, email, tax_type, tax_object_code, tax_object_name, dpp, rate, pph) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [item.id_type, item.identity_number, item.name, item.email, item.tax_type, item.tax_object_code, item.tax_object_name, item.dpp, item.rate, item.pph]);
                            insertedCount++;
                        }
                    }
                }
                res.json({ success: true, message: `Berhasil memproses ${items.length} data! (${insertedCount} baru, ${updatedCount} diperbarui)` });
            } catch (error) {
                res.status(500).json({ error: 'Gagal memproses data: ' + error.message });
            }
        });
    } catch (error) {
        console.error("Error processing Excel:", error);
        res.status(500).json({ error: 'Failed to process Excel file: ' + (error.stack || error.toString()) });
    }
});

// --- MASTER TAX OBJECTS (IMPORT EXCEL) ---

// Uses existing 'upload' configuration from earlier in file


app.get('/api/master-tax-objects/template', (req, res) => {
    // Create a new workbook and worksheet
    const wb = XLSX.utils.book_new();
    const wsData = [
        ['Jenis PPh', 'Kode Objek Pajak', 'Nama Objek Pajak', 'Tarif (%)', 'Keterangan'], // Header
        ['21', '21-100-01', 'Upah Pegawai Tidak Tetap', 5, 'Contoh pengisian'],
        ['23', '23-100-02', 'Jasa Teknik', 2, 'Contoh pengisian'],
        ['4(2)', '4(2)-100-03', 'Sewa Tanah dan Bangunan', 10, 'Contoh pengisian']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Adjust column width
    ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 50 }, { wch: 10 }, { wch: 30 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    // Write to buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="Template_Master_Objek_Pajak.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

app.post('/api/master-tax-objects/import', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        console.log("Processing file:", req.file.path);

        if (!fs.existsSync(req.file.path)) {
            throw new Error(`File not found at path: ${req.file.path}`);
        }

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        db.all("SELECT id, tax_type, code FROM master_tax_objects", [], async (err, existingRows) => {
            if (err) {
                console.error("Master import check error:", err);
                return res.status(500).json({ error: 'Gagal mengecek data master: ' + err.message });
            }

            // 1. Grouping & Deduplikasi data dari file Excel
            const groupedData = {};
            data.forEach(row => {
                const taxType = String(row['Jenis PPh'] || '').trim();
                const code = String(row['Kode Objek Pajak'] || '').trim();
                const name = row['Nama Objek Pajak'];

                if (!taxType || !code || !name) return;

                const key = `${taxType}|${code}`;
                // Jika ada duplikat di file, baris terakhir yang akan diambil
                groupedData[key] = {
                    tax_type: taxType,
                    code: code,
                    name: name,
                    rate: Number(row['Tarif (%)']) || 0,
                    note: row['Keterangan'] || ''
                };
            });

            const items = Object.values(groupedData);
            let updatedCount = 0;
            let insertedCount = 0;

            const runQuery = (sql, params) => new Promise((resolve, reject) => {
                db.run(sql, params, function (err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });

            try {
                for (const item of items) {
                    // Cek apakah kombinasi Jenis PPh dan Kode Objek sudah ada di DB
                    const match = existingRows.find(r => String(r.tax_type) === item.tax_type && String(r.code) === item.code);

                    if (match) {
                        // Update data yang sudah ada
                        await runQuery("UPDATE master_tax_objects SET name=?, rate=?, note=? WHERE id=?",
                            [item.name, item.rate, item.note, match.id]);
                        updatedCount++;
                    } else {
                        // Insert data baru
                        await runQuery("INSERT INTO master_tax_objects (tax_type, code, name, rate, note) VALUES (?, ?, ?, ?, ?)",
                            [item.tax_type, item.code, item.name, item.rate, item.note]);
                        insertedCount++;
                    }
                }
                res.json({ success: true, message: `Berhasil memproses ${items.length} data master! (${insertedCount} baru, ${updatedCount} diperbarui)` });
            } catch (error) {
                res.status(500).json({ error: 'Gagal memproses data master: ' + error.message });
            }
        });
    } catch (error) {
        console.error("Error processing Excel:", error);
        res.status(500).json({ error: 'Failed to process Excel file: ' + (error.stack || error.toString()) });
    }
});

app.get('/api/master-tax-objects', (req, res) => {
    db.all("SELECT * FROM master_tax_objects ORDER BY tax_type, code", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- COMMENTS API ---
app.get('/api/documents/:id/comments', (req, res) => {
    db.all("SELECT * FROM comments WHERE documentId = ? ORDER BY timestamp ASC", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/documents/:id/comments', upload.single('attachment'), (req, res) => {
    const { user, text } = req.body;
    const documentId = req.params.id;
    const timestamp = new Date().toISOString();
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

    db.run("INSERT INTO comments (documentId, user, text, timestamp, attachmentUrl, attachmentName, attachmentType, attachmentSize) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [documentId, user, text, timestamp, attachmentUrl, attachmentName, attachmentType, attachmentSize],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.post('/api/documents/:id/promote-comment-attachment', async (req, res) => {
    const { commentId } = req.body;
    const docId = req.params.id;

    try {
        await knex.transaction(async trx => {
            const comment = await trx('comments').where('id', commentId).first();
            if (!comment || !comment.attachmentUrl) throw new Error("Attachment not found in comment");

            const doc = await trx('documents').where('id', docId).first();
            if (!doc) throw new Error("Document not found");

            let versionsHistory = [];
            try { versionsHistory = doc.versionsHistory ? JSON.parse(doc.versionsHistory) : []; } catch (e) { }

            versionsHistory.push({
                id: Date.now(),
                version: doc.version || 1,
                timestamp: doc.uploadDate || new Date().toISOString(),
                size: doc.size,
                type: doc.type,
                fileData: null, // Never store base64 in version history
                url: doc.url,
                title: doc.title,
                user: doc.owner || 'System'
            });

            const absoluteFilePath = path.join(UPLOADS_DIR, path.basename(comment.attachmentUrl));

            await trx('documents').where('id', docId).update({
                url: comment.attachmentUrl,
                type: comment.attachmentType,
                size: comment.attachmentSize,
                title: comment.attachmentName,
                uploadDate: new Date().toISOString(),
                versionsHistory: JSON.stringify(versionsHistory),
                version: knex.raw('COALESCE(version, 1) + 1'),
                status: 'processing',
                fileData: null,
                ocrContent: ''
            });

            if (fs.existsSync(absoluteFilePath)) {
                await addOCRJob(docId, absoluteFilePath, comment.attachmentType, comment.attachmentName);
            } else {
                console.warn(`Promoted attachment file not found on disk: ${absoluteFilePath}. OCR job skipped.`);
                await trx('documents').where('id', docId).update({ status: 'error', ocrContent: 'File not found for OCR' });
            }

            await systemLog(comment.user || 'System', "Promote Attachment", `Promote attachment "${comment.attachmentName}" from comment ${commentId} to document ${docId}`);
        });
        res.json({ success: true });
    } catch (err) {
        console.error("Error promoting comment attachment:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- TAX AUDIT NOTES API ---
app.get('/api/tax-audits/:auditId/steps/:stepIndex/notes', (req, res) => {
    const { auditId, stepIndex } = req.params;
    db.all("SELECT * FROM tax_audit_notes WHERE auditId = ? AND stepIndex = ? ORDER BY timestamp ASC", [auditId, stepIndex], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/tax-audits/:auditId/steps/:stepIndex/notes', upload.single('attachment'), (req, res) => {
    const { auditId, stepIndex } = req.params;
    const { user, text } = req.body;
    const timestamp = new Date().toISOString();
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

    db.run("INSERT INTO tax_audit_notes (auditId, stepIndex, user, text, timestamp, attachmentUrl, attachmentName, attachmentType, attachmentSize) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [auditId, stepIndex, user, text, timestamp, attachmentUrl, attachmentName, attachmentType, attachmentSize],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});




// --- STATISTICS API ---
app.get('/api/stats', (req, res) => {
    const stats = { stored: 0, borrowed: 0, audit: 0, empty: 0, occupancy: 0 };
    db.all("SELECT status, COUNT(*) as count FROM documents GROUP BY status", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Basic document stats
        const docCount = rows.reduce((acc, r) => acc + r.count, 0);
        stats.stored = docCount;

        // Inventory stats
        db.all("SELECT COUNT(*) as count FROM inventory_items", [], (err, invRows) => {
            if (!err && invRows.length > 0) stats.occupancy = invRows[0].count; // Simplified occupancy

            // Tax Audit stats
            db.all("SELECT COUNT(*) as count FROM tax_audits WHERE status = 'OPEN'", [], (err, auditRows) => {
                if (!err && auditRows.length > 0) stats.audit = auditRows[0].count;
                res.json(stats);
            });
        });
    });
});

// --- FOLDER MANAGEMENT API ---
app.get('/api/folders', (req, res) => {
    // Return a list of distinct folderIds or a folders table if it existed.
    // Since we only have folderId string in documents, we extract unique ones.
    db.all("SELECT DISTINCT folderId FROM documents WHERE folderId IS NOT NULL", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({ id: r.folderId, name: r.folderId })));
    });
});

// --- TAX SUMMARY API (Singular) ---
// Note: Frontend might use tax-summary (singular) for dashboard, while tax-summaries (plural) is for CRUD.
app.get('/api/tax-summary', (req, res) => {
    const year = new Date().getFullYear();
    db.all("SELECT * FROM tax_summaries WHERE year = ?", [year], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
            ...r,
            data: typeof r.data === 'string' ? JSON.parse(r.data || '{}') : (r.data || {})
        })));
    });
});

// --- AI SEMANTIC SEARCH API (Dashboard) ---
app.post('/api/search/ai', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.json({ results: [] });

    try {
        console.log(`[Search] Processing: "${query}"`);
        const queryVector = await generateEmbedding(query);
        const term = `%${query.toLowerCase()}%`;

        const dbAll = (sql, params) => new Promise((resolve) => {
            db.all(sql, params, (err, rows) => resolve(err ? [] : (rows || [])));
        });

        // 1. Keyword Search
        const docKeyword = await dbAll(
            `SELECT id, title, type, size, url, uploadDate, ocrContent, folderId 
             FROM documents WHERE title LIKE ? OR ocrContent LIKE ? LIMIT 20`,
            [term, term]
        );

        // 2. Vector Search
        let vectorResults = [];
        try {
            const docsWithVectors = await dbAll(
                `SELECT id, title, type, url, uploadDate, ocrContent, vector FROM documents WHERE vector IS NOT NULL LIMIT 100`, []
            );
            vectorResults = docsWithVectors
                .map(doc => {
                    try {
                        const vec = JSON.parse(doc.vector);
                        const similarity = cosineSimilarity(queryVector, vec);
                        return { ...doc, vector: undefined, similarity };
                    } catch { return null; }
                })
                .filter(d => d && d.similarity > 0.35)
                .sort((a, b) => b.similarity - a.similarity).slice(0, 10);
        } catch (e) { console.warn("Vector search skipped", e); }

        // 3. Merge
        const resultMap = new Map();
        [...vectorResults, ...docKeyword].forEach(doc => {
            if (!resultMap.has(doc.id)) {
                resultMap.set(doc.id, {
                    id: doc.id,
                    name: doc.title,
                    type: 'Document',
                    date: doc.uploadDate,
                    size: doc.size,
                    matchType: doc.similarity ? 'semantic' : 'keyword',
                    url: doc.url,
                    folderId: doc.folderId
                });
            }
        });

        res.json({ results: Array.from(resultMap.values()) });

    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body;
    if (!message) return res.json({ reply: 'Silakan ketik pertanyaan Anda.', results: [] });

    try {
        const queryVector = await generateEmbedding(message);
        const intent = await parseIntent(message, queryVector);
        const query = message.toLowerCase();
        const term = `%${query}%`;

        // Helper for DB queries as promises
        const dbAll = (sql, params) => new Promise((resolve) => {
            db.all(sql, params, (err, rows) => resolve(err ? [] : (rows || [])));
        });

        // --- 1. KEYWORD SEARCH (Full-Text) ---
        // Search documents by title and OCR content
        const docKeyword = await dbAll(
            `SELECT id, title, type, size, url, uploadDate, ocrContent, folderId, department, owner
             FROM documents
             WHERE title LIKE ? OR ocrContent LIKE ?
             LIMIT 30`,
            [term, term]
        );

        // Search invoices with intent filters
        let invFilters = ["(invoice_no LIKE ? OR vendor LIKE ? OR ocr_content LIKE ?)"];
        let invParams = [term, term, term];

        if (intent.vendor) {
            invFilters.push("vendor LIKE ?");
            invParams.push(`%${intent.vendor}%`);
        }
        if (intent.minAmount) {
            invFilters.push("amount >= ?");
            invParams.push(intent.minAmount);
        }
        if (intent.maxAmount) {
            invFilters.push("amount <= ?");
            invParams.push(intent.maxAmount);
        }

        const invKeyword = await dbAll(
            `SELECT i.id, i.invoice_no, i.vendor, i.amount, i.date as payment_date,
                    i.file_url, i.ocr_content, i.box_id, i.ordner_id, i.inventory_id,
                    inv.box_data
             FROM inventory_items i
             LEFT JOIN inventory inv ON i.inventory_id = inv.id
             WHERE ${invFilters.join(' AND ')}
             LIMIT 30`,
            invParams
        );

        // Search external items
        const extKeyword = await dbAll(
            `SELECT * FROM external_items WHERE boxId LIKE ? OR destination LIKE ? OR sender LIKE ? LIMIT 10`,
            [term, term, term]
        );

        // --- 2. VECTOR SEARCH (Semantic) ---
        let vectorResults = [];
        try {
            const docsWithVectors = await dbAll(
                `SELECT id, title, type, url, uploadDate, ocrContent, vector FROM documents WHERE vector IS NOT NULL LIMIT 100`, []
            );

            vectorResults = docsWithVectors
                .map(doc => {
                    try {
                        const docVector = JSON.parse(doc.vector);
                        const similarity = cosineSimilarity(queryVector, docVector);
                        return { ...doc, vector: undefined, similarity };
                    } catch { return null; }
                })
                .filter(d => d && d.similarity > 0.3)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 10);
        } catch (embErr) {
            console.warn("[Chat] Vector search skipped:", embErr.message);
        }

        // --- 3. MERGE & DEDUPLICATE ---
        const resultMap = new Map();

        // Process keyword document results
        docKeyword.forEach(doc => {
            if (!resultMap.has(doc.id)) {
                resultMap.set(doc.id, {
                    id: doc.id,
                    title: doc.title,
                    type: 'document',
                    fileType: doc.type,
                    url: doc.url,
                    date: doc.uploadDate,
                    snippet: doc.ocrContent ? doc.ocrContent.substring(0, 150) + '...' : '',
                    score: 0.5,
                    folderId: doc.folderId, // FIXED: added folderId
                    department: doc.department,
                    owner: doc.owner
                });
            }
        });

        // Boost with vector similarity scores
        vectorResults.forEach(doc => {
            if (resultMap.has(doc.id)) {
                resultMap.get(doc.id).score += doc.similarity;
            } else {
                resultMap.set(doc.id, {
                    id: doc.id,
                    title: doc.title,
                    type: 'document',
                    fileType: doc.type,
                    url: doc.url,
                    date: doc.uploadDate,
                    snippet: doc.ocrContent ? doc.ocrContent.substring(0, 150) + '...' : '',
                    score: doc.similarity,
                    folderId: doc.folderId, // FIXED: added folderId
                    semantic: true
                });
            }
        });

        // Process invoice results
        invKeyword.forEach(inv => {
            const key = `inv-${inv.id}`;
            if (!resultMap.has(key)) {
                let score = 0.5;
                if (intent.vendor && inv.vendor && inv.vendor.toLowerCase().includes(intent.vendor)) score += 0.3;
                if (intent.minAmount && inv.amount >= intent.minAmount) score += 0.2;

                resultMap.set(key, {
                    id: key,
                    title: `Invoice: ${inv.invoice_no}`,
                    type: 'invoice',
                    vendor: inv.vendor,
                    amount: inv.amount,
                    date: inv.payment_date,
                    url: inv.file_url,
                    boxId: inv.box_id,
                    slotId: inv.inventory_id,
                    score
                });
            }
        });

        // Process external items
        extKeyword.forEach(ext => {
            const key = `ext-${ext.id}`;
            resultMap.set(key, {
                id: key,
                title: `Box Eksternal: ${ext.boxId}`,
                type: 'external',
                destination: ext.destination,
                sender: ext.sender,
                date: ext.sentDate,
                score: 0.4
            });
        });

        // --- 3.5 SPECIALIZED ANALYTICS HANDLERS ---
        let analyticsResponse = '';
        const allResults = Array.from(resultMap.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 15);

        if (intent.type === 'aggregation') {
            const months = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            let sql = "SELECT * FROM tax_summaries WHERE 1=1";
            let params = [];

            if (intent.month) {
                sql += " AND month = ?";
                params.push(months[intent.month]);
            }
            if (intent.year) {
                sql += " AND year = ?";
                params.push(intent.year);
            }
            if (intent.taxType) {
                sql += " AND type = ?";
                params.push(intent.taxType);
            }

            const summaries = await new Promise(res => db.all(sql, params, (err, rows) => res(rows || [])));

            if (summaries.length > 0) {
                let totalAmount = 0;
                summaries.forEach(s => {
                    const data = typeof s.data === 'string' ? JSON.parse(s.data || '{}') : (s.data || {});
                    if (intent.taxType === 'PPH') {
                        if (data.pph) Object.values(data.pph).forEach(v => totalAmount += (Number(v) || 0));
                    } else if (intent.taxType === 'PPN') {
                        let inTotal = 0;
                        let outTotal = 0;
                        if (data.ppnIn) Object.values(data.ppnIn).forEach(v => inTotal += (Number(v) || 0));
                        if (data.ppnOut) Object.values(data.ppnOut).forEach(v => outTotal += (Number(v) || 0));
                        totalAmount += (outTotal - inTotal);
                    }
                });

                const periodStr = (intent.month ? months[intent.month] + ' ' : '') + (intent.year || '');
                analyticsResponse = `Berdasarkan data laporan ${intent.taxType}, total ${intent.taxType} untuk periode ${periodStr || 'keseluruhan'} adalah **Rp ${totalAmount.toLocaleString('id-ID')}**.`;
            } else {
                // --- OCR DATA MINING FALLBACK ---
                let minedTotal = 0;
                let foundAny = false;
                const searchItems = [...docKeyword, ...invKeyword];

                // Regex patterns for tax extraction
                const patterns = {
                    PPH: [/pph\s*(?:21|23|4|22)?\s*[:=]?\s*rp\.?\s*([\d.,]+)/i, /total\s*pph\s*[:=]?\s*rp\.?\s*([\d.,]+)/i],
                    PPN: [/ppn\s*[:=]?\s*rp\.?\s*([\d.,]+)/i, /pajak\s*pertambahan\s*nilai\s*[:=]?\s*rp\.?\s*([\d.,]+)/i]
                };

                const activePatterns = patterns[intent.taxType] || [];

                searchItems.forEach(item => {
                    const text = (item.ocrContent || item.ocr_content || '').toLowerCase();
                    activePatterns.forEach(pattern => {
                        const match = text.match(pattern);
                        if (match) {
                            const val = parseFloat(match[1].replace(/[.,]/g, (m) => m === ',' ? '.' : ''));
                            if (!isNaN(val)) {
                                minedTotal += val;
                                foundAny = true;
                            }
                        }
                    });
                });

                if (foundAny) {
                    analyticsResponse = `Saya tidak menemukan data di tabel ringkasan, namun berdasarkan **mining data OCR** dari dokumen yang relevan, estimasi total ${intent.taxType} adalah **Rp ${minedTotal.toLocaleString('id-ID')}**.`;
                } else {
                    analyticsResponse = `Saya tidak menemukan data laporan ${intent.taxType} di tabel ringkasan maupun di konten dokumen untuk periode tersebut.`;
                }
            }
        } else if (intent.type === 'comparison') {
            const months = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const targetMonths = intent.months.length > 0 ? intent.months.map(m => months[m]) : [months[intent.month]];
            const taxType = intent.taxType || 'PPH';

            let sql = "SELECT * FROM tax_summaries WHERE type = ? AND LOWER(month) IN (" + targetMonths.map(() => 'LOWER(?)').join(',') + ")";
            let params = [taxType, ...targetMonths];
            if (intent.year) {
                sql += " AND year = ?";
                params.push(intent.year);
            }

            const summaries = await dbAll(sql, params);
            if (summaries.length > 0) {
                let table = `| Bulan | Total ${taxType} | Pembetulan | Status |\n| :--- | :--- | :--- | :--- |\n`;
                const dataPoints = summaries.map(s => {
                    const data = typeof s.data === 'string' ? JSON.parse(s.data || '{}') : (s.data || {});
                    let amount = 0;
                    if (taxType === 'PPH' && data.pph) Object.values(data.pph).forEach(v => amount += (Number(v) || 0));
                    else if (taxType === 'PPN') {
                        let inT = 0, outT = 0;
                        if (data.ppnIn) Object.values(data.ppnIn).forEach(v => inT += (Number(v) || 0));
                        if (data.ppnOut) Object.values(data.ppnOut).forEach(v => outT += (Number(v) || 0));
                        amount = outT - inT;
                    }
                    table += `| ${s.month} ${s.year} | Rp ${amount.toLocaleString('id-ID')} | P-${s.pembetulan} | Terarsip |\n`;
                    return { month: s.month, amount };
                });

                analyticsResponse = `### Perbandingan Laporan ${taxType}\n\n${table}\n`;

                if (dataPoints.length >= 2) {
                    const diff = dataPoints[1].amount - dataPoints[0].amount;
                    const percent = ((diff / dataPoints[0].amount) * 100).toFixed(1);
                    const direction = diff >= 0 ? 'kenaikan' : 'penurunan';
                    analyticsResponse += `\n**Analisa:** Terjadi ${direction} sebesar **Rp ${Math.abs(diff).toLocaleString('id-ID')}** (${Math.abs(percent)}%) dari ${dataPoints[0].month} ke ${dataPoints[1].month}.`;
                }
            } else {
                analyticsResponse = `Maaf, saya tidak menemukan data laporan yang cukup untuk melakukan perbandingan ${taxType}.`;
            }

        } else if (intent.type === 'trend_analysis') {
            const taxType = intent.taxType || 'PPH';
            const summaries = await dbAll("SELECT * FROM tax_summaries WHERE type = ? ORDER BY year DESC, FIELD(month, 'Desember', 'November', 'Oktober', 'September', 'Agustus', 'Juli', 'Juni', 'Mei', 'April', 'Maret', 'Februari', 'Januari') LIMIT 6", [taxType]);

            if (summaries.length >= 2) {
                const dataPoints = summaries.reverse().map(s => {
                    const data = typeof s.data === 'string' ? JSON.parse(s.data || '{}') : (s.data || {});
                    let amount = 0;
                    if (taxType === 'PPH' && data.pph) Object.values(data.pph).forEach(v => amount += (Number(v) || 0));
                    else if (taxType === 'PPN') {
                        let inT = 0, outT = 0;
                        if (data.ppnIn) Object.values(data.ppnIn).forEach(v => inT += (Number(v) || 0));
                        if (data.ppnOut) Object.values(data.ppnOut).forEach(v => outT += (Number(v) || 0));
                        amount = outT - inT;
                    }
                    return amount;
                });

                const lastVal = dataPoints[dataPoints.length - 1];
                const prevVal = dataPoints[dataPoints.length - 2];
                const avgGrowth = (lastVal - dataPoints[0]) / (dataPoints.length - 1);
                const projectedVal = Math.max(0, lastVal + avgGrowth);

                analyticsResponse = `### Analisa Trend & Proyeksi ${taxType}\n\n`;
                analyticsResponse += `Berdasarkan data ${dataPoints.length} bulan terakhir, trend pembayaran ${taxType} Anda cenderung **${avgGrowth >= 0 ? 'meningkat' : 'menurun'}**.\n\n`;
                analyticsResponse += `- **Rata-rata perubahan:** Rp ${avgGrowth.toLocaleString('id-ID')} / bulan\n`;
                analyticsResponse += `- **Proyeksi bulan depan:** **Rp ${projectedVal.toLocaleString('id-ID')}**\n\n`;
                analyticsResponse += `> [!NOTE]\n> Proyeksi ini bersifat estimatif berdasarkan rata-rata historis. Pastikan untuk memvalidasi dengan transaksi riil bulan berjalan.`;
            } else {
                analyticsResponse = `Data historis tidak cukup untuk melakukan analisa trend ${taxType}. Minimal diperlukan data 2 bulan.`;
            }

        } else if (intent.type === 'tax_lookup') {
            const term = `%${message.toLowerCase()}%`;
            const taxObjects = await dbAll(
                `SELECT * FROM master_tax_objects 
                 WHERE name LIKE ? OR code LIKE ? OR Note LIKE ? OR tax_type LIKE ?
                 LIMIT 10`,
                [term, term, term, term]
            );

            // Also try semantic search if queryVector exists
            let semanticTax = [];
            if (queryVector) {
                const allTax = await dbAll("SELECT id, name, code, note, tax_type, rate, vector FROM master_tax_objects WHERE vector IS NOT NULL", []);
                semanticTax = allTax.map(t => {
                    try {
                        const v = JSON.parse(t.vector);
                        const sim = cosineSimilarity(queryVector, v);
                        return { ...t, similarity: sim };
                    } catch { return null; }
                })
                    .filter(t => t && t.similarity > 0.45)
                    .sort((a, b) => b.similarity - a.similarity)
                    .slice(0, 5);
            }

            // Merge results
            const taxMap = new Map();
            taxObjects.forEach(t => taxMap.set(t.id, { ...t, score: 0.5 }));
            semanticTax.forEach(t => {
                if (taxMap.has(t.id)) taxMap.get(t.id).score += t.similarity;
                else taxMap.set(t.id, { ...t, score: t.similarity });
            });

            const finalTax = Array.from(taxMap.values()).sort((a, b) => b.score - a.score);

            if (finalTax.length > 0) {
                const top = finalTax[0];
                analyticsResponse = `### Informasi Objek Pajak: ${top.name}\n\n`;
                analyticsResponse += `- **Kode**: \`${top.code}\`\n`;
                analyticsResponse += `- **Jenis**: ${top.tax_type}\n`;
                analyticsResponse += `- **Tarif**: ${top.rate || 0}%\n`;
                if (top.note) analyticsResponse += `- **Keterangan**: ${top.note}\n`;

                if (finalTax.length > 1) {
                    analyticsResponse += `\n**Hasil lainnya:**\n`;
                    finalTax.slice(1, 4).forEach(t => {
                        analyticsResponse += `- **${t.name}** (${t.tax_type}): Tarif ${t.rate}%\n`;
                    });
                }
            } else {
                analyticsResponse = `Maaf, saya tidak menemukan informasi detail mengenai "${message}" di database objek pajak kami.`;
            }
        } else if (intent.type === 'audit_status') {
            const audits = await dbAll("SELECT * FROM tax_audits ORDER BY startDate DESC LIMIT 5", []);
            if (audits.length > 0) {
                analyticsResponse = `### Status Pemeriksaan Pajak\n\n` + audits.map(a =>
                    `- **${a.title}**: ${a.status} (Langkah ${a.currentStep}). No Surat: \`${a.letterNumber || '-'}\``
                ).join('\n');
            } else {
                analyticsResponse = `Tidak ada data pemeriksaan pajak (tax audit) yang tercatat saat ini.`;
            }
        }

        // --- 4. GENERATE CONVERSATIONAL RESPONSE ---
        const docCount = allResults.filter(r => r.type === 'document').length;
        const invCount = allResults.filter(r => r.type === 'invoice').length;
        const extCount = allResults.filter(r => r.type === 'external').length;
        const total = allResults.length;

        let reply = '';
        if (analyticsResponse) {
            reply = analyticsResponse;
            if (total > 0) {
                reply += `\n\nSaya juga menemukan ${total} dokumen/item yang relevan:`;
            }
        } else if (total === 0) {
            reply = `Maaf, saya tidak menemukan hasil untuk "${message}". Coba kata kunci lain atau pertanyaan yang lebih spesifik.`;
        } else {
            // RAG: Generate Natural Language Answer
            const topContexts = allResults.slice(0, 3).map(r => {
                if (r.type === 'document') return `Dokumen "${r.title}": ${r.snippet}`;
                if (r.type === 'invoice') return `Invoice ${r.title} dari ${r.vendor} senilai ${r.amount}`;
                return '';
            });

            if (topContexts.length > 0) {
                reply = await generateAnswer(message, topContexts);
            } else {
                reply = `Saya menemukan ${total} hasil yang relevan.`;
            }
        }

        res.json({ reply, results: allResults, intent });

    } catch (error) {
        console.error("[Chat Error]", error);
        res.json({
            reply: `Maaf, terjadi kesalahan saat memproses pertanyaan Anda: ${error.message}`,
            results: [],
            error: true
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
