import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import db from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { addOCRJob, ocrQueue } from './queue.js'; // NEW

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

// --- PUSTAKA (KNOWLEDGE BASE) API ---
app.get('/api/pustaka/guides', (req, res) => {
    db.all("SELECT * FROM pustaka_guides ORDER BY category, title ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const result = (rows || []).map(r => ({
            ...r,
            allowed_depts: r.allowed_depts ? JSON.parse(r.allowed_depts) : [],
            allowed_users: r.allowed_users ? JSON.parse(r.allowed_users) : []
        }));
        res.json(result);
    });
});

app.get('/api/pustaka/search', (req, res) => {
    const q = req.query.q;
    if (!q) return res.json([]);

    const term = `%${q}%`;
    const sql = `
        SELECT DISTINCT g.* 
        FROM pustaka_guides g
        LEFT JOIN pustaka_slides s ON g.id = s.guide_id
        WHERE g.title LIKE ? OR g.description LIKE ? OR g.category LIKE ? OR s.title LIKE ? OR s.content LIKE ?
        ORDER BY g.title ASC
    `;

    db.all(sql, [term, term, term, term, term], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/pustaka/categories', (req, res) => {
    db.all("SELECT * FROM pustaka_categories ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/pustaka/categories', (req, res) => {
    const { name } = req.body;
    db.run("INSERT INTO pustaka_categories (name) VALUES (?)", [name], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

app.delete('/api/pustaka/categories/:id', (req, res) => {
    db.run("DELETE FROM pustaka_categories WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/pustaka/guides/:id/slides', (req, res) => {
    db.all("SELECT * FROM pustaka_slides WHERE guide_id = ? ORDER BY step_order ASC", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/pustaka/guides', (req, res) => {
    const { title, description, category, icon, privacy, allowed_depts, allowed_users, owner } = req.body;
    db.run("INSERT INTO pustaka_guides (title, description, category, icon, privacy, allowed_depts, allowed_users, owner) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [title, description, category, icon, privacy || 'public', JSON.stringify(allowed_depts || []), JSON.stringify(allowed_users || []), owner],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.put('/api/pustaka/guides/:id', (req, res) => {
    const { title, description, category, icon, privacy, allowed_depts, allowed_users } = req.body;
    db.run("UPDATE pustaka_guides SET title = ?, description = ?, category = ?, icon = ?, privacy = ?, allowed_depts = ?, allowed_users = ? WHERE id = ?",
        [title, description, category, icon, privacy, JSON.stringify(allowed_depts || []), JSON.stringify(allowed_users || []), req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/pustaka/guides/:id', (req, res) => {
    const guideId = req.params.id;
    db.run("DELETE FROM pustaka_guides WHERE id = ?", [guideId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        db.run("DELETE FROM pustaka_slides WHERE guide_id = ?", [guideId], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ success: true });
        });
    });
});

app.delete('/api/pustaka/slides/by-guide/:id', (req, res) => {
    db.run("DELETE FROM pustaka_slides WHERE guide_id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/pustaka/slides', (req, res) => {
    const { guide_id, title, content, image, step_order } = req.body;
    db.run("INSERT INTO pustaka_slides (guide_id, title, content, image, step_order) VALUES (?, ?, ?, ?, ?)",
        [guide_id, title, content, image, step_order],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// --- DOCUMENT APPROVAL API ---
app.get('/api/approvals', (req, res) => {
    db.all("SELECT * FROM document_approvals ORDER BY created_at DESC", [], (err, approvals) => {
        if (err) return res.status(500).json({ error: err.message });
        const safeApprovals = approvals || [];
        db.all("SELECT * FROM approval_steps ORDER BY approval_id, step_index ASC", [], (err2, steps) => {
            if (err2) return res.status(500).json({ error: err2.message });
            const safeSteps = steps || [];
            const result = safeApprovals.map(item => ({
                ...item,
                steps: safeSteps.filter(s => s.approval_id === item.id)
            }));
            res.json(result);
        });
    });
});

app.post('/api/approvals', (req, res) => {
    const { title, description, division, requester_name, requester_username, attachment_url, attachment_name, steps } = req.body;
    const now = new Date().toISOString();

    db.run(`INSERT INTO document_approvals (title, description, division, requester_name, requester_username, attachment_url, attachment_name, status, created_at, current_step_index) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, 0)`,
        [title, description, division, requester_name, requester_username, attachment_url, attachment_name, now],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            const approvalId = this.lastID;

            // Insert steps
            const stepPromises = steps.map((step, index) => {
                return new Promise((resolve, reject) => {
                    db.run(`INSERT INTO approval_steps (approval_id, step_index, approver_username, approver_name) VALUES (?, ?, ?, ?)`,
                        [approvalId, index, step.username, step.name],
                        (sErr) => sErr ? reject(sErr) : resolve()
                    );
                });
            });

            Promise.all(stepPromises)
                .then(() => res.json({ success: true, id: approvalId }))
                .catch(pErr => res.status(500).json({ error: pErr.message }));
        }
    );
});

app.post('/api/approvals/:id/action', upload.single('file'), (req, res) => {
    const { action, note, username } = req.body; // action: 'Approve' | 'Reject'
    const approvalId = req.params.id;
    const now = new Date().toISOString();

    let attachment_url = null;
    let attachment_name = null;
    if (req.file) {
        attachment_url = `/uploads/${req.file.filename}`;
        attachment_name = req.file.originalname;
    }

    db.get("SELECT * FROM document_approvals WHERE id = ?", [approvalId], (err, approval) => {
        if (err || !approval) return res.status(404).json({ error: "Not found" });

        const currentIndex = approval.current_step_index;

        // Update current step
        db.run(`UPDATE approval_steps SET status = ?, action_date = ?, note = ?, attachment_url = ?, attachment_name = ? 
                WHERE approval_id = ? AND step_index = ? AND approver_username = ?`,
            [action === 'Approve' ? 'Approved' : 'Rejected', now, note, attachment_url, attachment_name, approvalId, currentIndex, username],
            function (stepErr) {
                if (stepErr) return res.status(500).json({ error: stepErr.message });

                if (action === 'Reject') {
                    // If rejected, the whole document is rejected
                    db.run("UPDATE document_approvals SET status = 'Rejected' WHERE id = ?", [approvalId], () => {
                        res.json({ success: true, status: 'Rejected' });
                    });
                } else {
                    // Check if there are more steps
                    db.get("SELECT COUNT(*) as count FROM approval_steps WHERE approval_id = ?", [approvalId], (cErr, row) => {
                        const nextIndex = currentIndex + 1;
                        if (nextIndex < row.count) {
                            db.run("UPDATE document_approvals SET current_step_index = ? WHERE id = ?", [nextIndex, approvalId], () => {
                                res.json({ success: true, status: 'Pending', nextStep: nextIndex });
                            });
                        } else {
                            db.run("UPDATE document_approvals SET status = 'Approved' WHERE id = ?", [approvalId], () => {
                                // Sinkronisasi ke folder Documents dan jalankan OCR hanya setelah Approved
                                db.get("SELECT title, attachment_url, attachment_name, requester_name, division FROM document_approvals WHERE id = ?", [approvalId], (err, app) => {
                                    if (app && app.attachment_url) {
                                        // Cari folder tujuan (ApprovalDoc -> Judul)
                                        db.get("SELECT id FROM folders WHERE name = 'ApprovalDoc' AND (parentId IS NULL OR parentId = 0 OR parentId = 'null')", [], (err, parent) => {
                                            if (parent) {
                                                db.get("SELECT id FROM folders WHERE name = ? AND parentId = ?", [app.title, parent.id], (err, folder) => {
                                                    if (folder) {
                                                        const docId = `DOC-APP-${Date.now()}`;
                                                        const ext = path.extname(app.attachment_name || '').toLowerCase();
                                                        let type = 'application/pdf';
                                                        if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) type = 'image/jpeg';

                                                        // Masukkan ke tabel documents agar muncul di file explorer
                                                        db.run(`INSERT INTO documents (id, title, type, size, uploadDate, url, folderId, department, owner, status, ocrContent) 
                                                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing', '')`,
                                                            [docId, app.attachment_name, type, '0 KB', now, app.attachment_url, folder.id, app.division, app.requester_name],
                                                            (docErr) => {
                                                                if (!docErr) {
                                                                    const filename = path.basename(app.attachment_url);
                                                                    const absolutePath = path.join(UPLOADS_DIR, filename);
                                                                    // Jalankan OCR untuk dokumen baru ini
                                                                    addOCRJob(docId, absolutePath, type, app.attachment_name, {
                                                                        type: 'document',
                                                                        documentId: docId,
                                                                        approvalId: approvalId // Berikan info approvalId agar worker bisa update ocr_content di tabel approval juga
                                                                    }).catch(e => console.error("Final Approval OCR Error:", e));
                                                                }
                                                            }
                                                        );
                                                    }
                                                });
                                            }
                                        });
                                    }
                                    res.json({ success: true, status: 'Approved' });
                                });
                            });
                        }
                    });
                }
            }
        );
    });
});

app.post('/api/approvals/:id/reset-step', (req, res) => {
    const { stepIndex } = req.body;
    const approvalId = req.params.id;

    // 1. Kembalikan index dokumen ke langkah yang dipilih dan set status ke Pending
    db.run(`UPDATE document_approvals SET current_step_index = ?, status = 'Pending' WHERE id = ?`,
        [stepIndex, approvalId], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // 2. Bersihkan status dan catatan pada langkah tersebut dan semua langkah setelahnya
            db.run(`UPDATE approval_steps SET status = 'Pending', action_date = NULL, note = NULL, attachment_url = NULL, attachment_name = NULL 
                WHERE approval_id = ? AND step_index >= ?`, [approvalId, stepIndex], (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ success: true });
            });
        });
});

app.put('/api/approvals/:id', (req, res) => {
    const { title, description, division, attachment_url, attachment_name, steps } = req.body;
    const approvalId = req.params.id;

    // 1. Ambil data lama untuk cek perubahan lampiran
    db.get("SELECT attachment_url FROM document_approvals WHERE id = ?", [approvalId], (err, oldRow) => {
        const attachmentChanged = oldRow && oldRow.attachment_url !== attachment_url;
        const ocrUpdateSql = attachmentChanged ? ", ocr_content = NULL" : "";

        // 2. Reset status ke Pending dan index ke 0 (Alur kereset ke awal)
        db.run(`UPDATE document_approvals SET title = ?, description = ?, division = ?, attachment_url = ?, attachment_name = ?, status = 'Pending', current_step_index = 0 ${ocrUpdateSql}
                WHERE id = ?`,
            [title, description, division, attachment_url, attachment_name, approvalId],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });

                // 3. Hapus langkah lama dan masukkan langkah baru (reset flow steps)
                db.run("DELETE FROM approval_steps WHERE approval_id = ?", [approvalId], (delErr) => {
                    if (delErr) return res.status(500).json({ error: delErr.message });

                    const stepPromises = steps.map((step, index) => {
                        return new Promise((resolve, reject) => {
                            db.run(`INSERT INTO approval_steps (approval_id, step_index, approver_username, approver_name) VALUES (?, ?, ?, ?)`,
                                [approvalId, index, step.username, step.name],
                                (sErr) => sErr ? reject(sErr) : resolve()
                            );
                        });
                    });

                    Promise.all(stepPromises)
                        .then(() => res.json({ success: true }))
                        .catch(pErr => res.status(500).json({ error: pErr.message }));
                });
            }
        );
    });
});

app.delete('/api/approvals/:id', (req, res) => {
    db.run("DELETE FROM document_approvals WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- APPROVAL FLOWS (MASTER) API ---
app.get('/api/approval-flows', (req, res) => {
    db.all("SELECT * FROM approval_flows ORDER BY name ASC", [], (err, rows) => {
        if (err) {
            console.error("Database Error (approval-flows):", err.message);
            return res.status(500).json({ error: "Gagal mengambil data alur. Pastikan tabel approval_flows sudah dibuat." });
        }
        const safeRows = rows || [];
        const result = safeRows.map(r => {
            try { return { ...r, steps: JSON.parse(r.steps || '[]') }; }
            catch (e) { return { ...r, steps: [] }; }
        });
        res.json(result);
    });
});

app.post('/api/approval-flows', (req, res) => {
    const { name, description, steps } = req.body;
    db.run("INSERT INTO approval_flows (name, description, steps) VALUES (?, ?, ?)",
        [name, description, JSON.stringify(steps || [])],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.put('/api/approval-flows/:id', (req, res) => {
    const { name, description, steps } = req.body;
    db.run("UPDATE approval_flows SET name = ?, description = ?, steps = ? WHERE id = ?",
        [name, description, JSON.stringify(steps || []), req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/approval-flows/:id', (req, res) => {
    db.run("DELETE FROM approval_flows WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Helper: Save Base64 to File
function saveBase64ToFile(base64Data, id, extension = 'bin') {
    try {
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return null;
        }

        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `DOC-${id}-${Date.now()}.${extension}`;
        const filePath = path.join(UPLOADS_DIR, filename);

        fs.writeFileSync(filePath, buffer);
        console.log(`Saved file to disk: ${filename}`);
        return `/uploads/${filename}`;
    } catch (e) {
        console.error("File save error:", e);
        return null;
    }
}

// --- UNIVERSAL SEARCH API (AI SEMANTIC) ---
app.get('/api/search', (req, res) => {
    const query = (req.query.q || '').toLowerCase();
    if (!query) return res.json([]);

    // 1. Search Documents
    const docPromise = new Promise((resolve) => {
        const sql = `SELECT * FROM documents`;
        db.all(sql, [], (err, rows) => {
            if (err || !rows) return resolve([]);

            const matches = rows.filter(doc => {
                const title = (doc.title || '').toLowerCase();
                const ocr = (doc.ocrContent || '').toLowerCase();
                return title.includes(query) || ocr.includes(query);
            }).map(doc => {
                // Calculate Relevance Score
                let score = 0;
                const title = (doc.title || '').toLowerCase();
                if (title.includes(query)) score += 0.5;
                if (doc.ocrContent && doc.ocrContent.toLowerCase().includes(query)) score += 0.3;
                // Exact match bonus
                if (title === query) score += 0.5;

                return {
                    id: doc.id,
                    title: doc.title,
                    type: doc.type || 'document',
                    size: doc.size,
                    uploadDate: doc.uploadDate,
                    folderId: doc.folderId,
                    folderName: 'Digital Archive', // Todo: Join foldernames if needed
                    score: score,
                    matchType: 'document'
                };
            });
            resolve(matches);
        });
    });

    // 2. Search Inventory (Invoices inside Boxes)
    const invPromise = new Promise((resolve) => {
        const sql = `SELECT * FROM inventory`;
        db.all(sql, [], (err, rows) => {
            if (err || !rows) return resolve([]);

            const matches = [];
            rows.forEach(slot => {
                const rawData = slot.box_data || slot.boxData;
                if (!rawData) return;
                try {
                    const box = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
                    if (box.ordners) {
                        box.ordners.forEach(ord => {
                            if (ord.invoices) {
                                ord.invoices.forEach(inv => {
                                    const invNo = (inv.invoiceNo || '').toLowerCase();
                                    const vendor = (inv.vendor || '').toLowerCase();
                                    const ocr = (typeof inv.ocrContent === 'string' ? inv.ocrContent : JSON.stringify(inv.ocrContent || '')).toLowerCase();

                                    if (invNo.includes(query) || vendor.includes(query) || ocr.includes(query)) {
                                        let score = 0;
                                        if (invNo.includes(query)) score += 0.5;
                                        if (vendor.includes(query)) score += 0.4;
                                        if (ocr.includes(query)) score += 0.3;

                                        matches.push({
                                            id: `INV-${inv.id}`,
                                            title: `Invoice: ${inv.invoiceNo} (${inv.vendor})`,
                                            type: inv.file && inv.file.match(/image\//) ? 'image/jpeg' : 'application/pdf',
                                            size: inv.fileName || 'Invoice',
                                            uploadDate: inv.paymentDate || new Date().toISOString(),
                                            folderId: 'INVENTORY', // Special flag for frontend
                                            folderName: `Box ${box.boxId} / Ordner ${ord.noOrdner}`,
                                            score: score,
                                            matchType: 'invoice',
                                            data: inv, // Pass full object for viewing
                                            boxId: box.boxId,
                                            slotId: slot.id,
                                            ocrContent: typeof inv.ocrContent === 'string' ? inv.ocrContent : JSON.stringify(inv.ocrContent || ''), // Include OCR for display
                                            url: inv.file // Ensure URL is passed for download/view
                                        });
                                    }
                                });
                            }
                        });
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            });
            resolve(matches);
        });
    });

    // 3. Search External Items (Indoarsip)
    const extPromise = new Promise((resolve) => {
        const sql = `SELECT * FROM external_items`;
        db.all(sql, [], (err, rows) => {
            if (err || !rows) return resolve([]);

            const matches = [];
            rows.forEach(item => {
                const boxId = (item.boxId || '').toLowerCase();
                const dest = (item.destination || '').toLowerCase();
                const sender = (item.sender || '').toLowerCase();

                let score = 0;
                let found = false;

                if (boxId.includes(query)) { score += 0.6; found = true; }
                if (dest.includes(query)) { score += 0.4; found = true; }
                if (sender.includes(query)) { score += 0.4; found = true; }

                // Nested search in boxData (if exists)
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
                } catch (e) { }

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
            resolve(matches);
        });
    });

    // 4. Search Tax Summaries
    const taxSumPromise = new Promise((resolve) => {
        const sql = `SELECT * FROM tax_summaries`;
        db.all(sql, [], (err, rows) => {
            if (err || !rows) return resolve([]);

            const matches = [];
            rows.forEach(record => {
                const month = (record.month || '').toLowerCase();
                const year = String(record.year || '').toLowerCase();

                let score = 0;
                let found = false;

                if (month.includes(query)) { score += 0.5; found = true; }
                if (year.includes(query)) { score += 0.5; found = true; }

                // Check specific values if query is a number
                if (!isNaN(query) && query.length > 3) {
                    // Cari di dalam string JSON data
                    const dataStr = typeof record.data === 'string' ? record.data : JSON.stringify(record.data || {});
                    if (dataStr.toLowerCase().includes(query)) {
                        score += 0.4;
                        found = true;
                    }
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
            resolve(matches);
        });
    });

    // 5. Search Tax Objects (Database WP)
    const taxObjPromise = new Promise((resolve) => {
        const sql = `SELECT * FROM tax_objects`;
        db.all(sql, [], (err, rows) => {
            if (err || !rows) return resolve([]);
            const matches = rows.filter(item => {
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
            resolve(matches);
        });
    });

    // 6. Search Pustaka (Guides & Slides)
    const pustakaPromise = new Promise((resolve) => {
        const sql = `
            SELECT g.*, s.title as slideTitle, s.content as slideContent 
            FROM pustaka_guides g 
            LEFT JOIN pustaka_slides s ON g.id = s.guide_id
        `;
        db.all(sql, [], (err, rows) => {
            if (err || !rows) return resolve([]);
            const groups = {};
            rows.forEach(row => {
                if (!groups[row.id]) groups[row.id] = { ...row, searchableContent: (row.title + " " + (row.description || "")).toLowerCase() };
                if (row.slideTitle) groups[row.id].searchableContent += ` ${row.slideTitle.toLowerCase()} ${row.slideContent.toLowerCase()}`;
            });
            const matches = Object.values(groups).filter(g => g.searchableContent.includes(query)).map(g => ({
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
            resolve(matches);
        });
    });

    // 7. Search Approvals
    const approvalPromise = new Promise((resolve) => {
        db.all(`SELECT * FROM document_approvals`, [], (err, rows) => {
            if (err || !rows) return resolve([]);
            const matches = rows.filter(a => (a.title || '').toLowerCase().includes(query) || (a.description || '').toLowerCase().includes(query))
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
            resolve(matches);
        });
    });

    // 8. Search Chat History / Notes
    const notePromise = new Promise((resolve) => {
        db.all(`
            SELECT n.*, a.title as auditTitle 
            FROM tax_audit_notes n 
            LEFT JOIN tax_audits a ON n.auditId = a.id
        `, [], (err, rows) => {
            if (err || !rows) return resolve([]);
            const matches = rows.filter(n => (n.text || '').toLowerCase().includes(query))
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
            resolve(matches);
        });
    });

    Promise.all([docPromise, invPromise, extPromise, taxSumPromise, taxObjPromise, pustakaPromise, approvalPromise, notePromise]).then(([docs, invs, exts, taxSums, taxObjs, pustakas, apps, notes]) => {
        // Merge and Sort by Score
        const allResults = [...docs, ...invs, ...exts, ...taxSums, ...taxObjs, ...pustakas, ...apps, ...notes].sort((a, b) => b.score - a.score);
        res.json(allResults.slice(0, 50)); // Limit to top 50
    }).catch(err => {
        console.error("Search Error:", err);
        res.status(500).json({ error: "Search failed" });
    });
});


// Helper: Process Inventory Object to Extract Files
function processInventoryFiles(dataObj, contextId) {
    if (!dataObj || !dataObj.ordners) return dataObj;

    dataObj.ordners.forEach(ord => {
        if (ord.invoices && Array.isArray(ord.invoices)) {
            ord.invoices.forEach(inv => {
                if (inv.file && typeof inv.file === 'string' && inv.file.startsWith('data:')) {
                    const ext = (inv.fileName || 'bin').split('.').pop();
                    const fileId = `INV-${String(contextId).replace(/[^a-zA-Z0-9-]/g, '')}-${inv.id || Date.now()}`;
                    const savedUrl = saveBase64ToFile(inv.file, fileId, ext);
                    if (savedUrl) {
                        inv.file = savedUrl;
                        console.log(`Inventory File Saved to Disk: ${savedUrl}`);

                        // Queue OCR for this unique invoice
                        const absolutePath = path.join(UPLOADS_DIR, path.basename(savedUrl));
                        addOCRJob(contextId, absolutePath, inv.fileType || 'application/pdf', inv.fileName, {
                            type: 'inventory',
                            slotId: contextId,
                            ordnerId: ord.id,
                            invoiceId: inv.id
                        }).catch(e => console.error("Inventory OCR Queue Error:", e));
                    }
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

// INCREASE MYSQL PACKET SIZE (Critical for large uploads)
db.run("SET GLOBAL max_allowed_packet = 67108864", [], (err) => { // 64MB
    if (err) console.error("Warning: Failed to set max_allowed_packet:", err.message);
    else console.log("MySQL Config: max_allowed_packet set to 64MB for large uploads");
});

// --- USERS ---
app.get('/api/users', (req, res) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/folders', (req, res) => {
    console.log('GET /api/folders REQUESTED');
    db.all("SELECT * FROM folders ORDER BY name ASC", [], (err, rows) => {
        if (err) {
            console.error('GET /api/folders ERROR:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('GET /api/folders SUCCESS:', rows ? rows.length : 0, 'folders found');
        res.json(rows);
    });
});

app.post('/api/users', (req, res) => {
    const { username, password, name, role, department } = req.body;
    db.run("INSERT INTO users (username, password, name, role, department) VALUES (?, ?, ?, ?, ?)",
        [username, password, name, role, department],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/users/:id', (req, res) => {
    const { username, password, name, role, department } = req.body;

    // Fetch OLD value for Audit
    db.get("SELECT * FROM users WHERE id = ?", [req.params.id], (err, oldUser) => {
        if (err || !oldUser) {
            // Fallback if fetch fails, still update but no detailed audit
            console.error("Failed to fetch old user for audit", err);
        }

        db.run("UPDATE users SET username = ?, password = ?, name = ?, role = ?, department = ? WHERE id = ?",
            [username, password, name, role, department, req.params.id],
            async function (err) {
                if (err) return res.status(500).json({ error: err.message });

                // Detailed Audit Log
                if (oldUser) {
                    const changes = [];
                    if (oldUser.username !== username) changes.push(`Username: ${oldUser.username} -> ${username}`);
                    if (oldUser.role !== role) changes.push(`Role: ${oldUser.role} -> ${role}`);
                    if (oldUser.department !== department) changes.push(`Dept: ${oldUser.department} -> ${department}`);

                    if (changes.length > 0) {
                        await systemLog(null, "Update User", `Update User: ${name}`, JSON.stringify(oldUser), JSON.stringify({ username, password, name, role, department }));
                    }
                }

                res.json({ success: true, changes: this.changes });
            }
        );
    });
});

app.put('/api/users/profile/:id', (req, res) => {
    const { name, currentPassword, newPassword } = req.body;
    const userId = req.params.id;

    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // If trying to update password, verify current password first
        if (newPassword) {
            if (user.password !== currentPassword) {
                return res.status(400).json({ success: false, error: 'Password saat ini salah' });
            }
        }

        const updatedName = name || user.name;
        const updatedPassword = newPassword || user.password;

        db.run("UPDATE users SET name = ?, password = ? WHERE id = ?",
            [updatedName, updatedPassword, userId],
            async function (err) {
                if (err) return res.status(500).json({ success: false, error: err.message });

                const oldValues = { name: user.name, password: '***' };
                const newValues = { name: updatedName, password: newPassword ? '***' : '***' };

                await systemLog(user.name, "Update Profile", `User ${user.username} updated their profile`, JSON.stringify(oldValues), JSON.stringify(newValues));

                res.json({
                    success: true,
                    user: {
                        ...user,
                        name: updatedName,
                        password: updatedPassword
                    }
                });
            }
        );
    });
});

app.delete('/api/users/:id', (req, res) => {
    db.run("DELETE FROM users WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- DEPARTMENTS ---
app.get('/api/departments', (req, res) => {
    db.all("SELECT * FROM departments", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows); // Return full objects {id, name}
    });
});

app.post('/api/departments', (req, res) => {
    db.run("INSERT INTO departments (name) VALUES (?)", [req.body.name], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

app.put('/api/departments/:id', (req, res) => {
    const newName = req.body.name;
    db.get("SELECT * FROM departments WHERE id = ?", [req.params.id], (err, oldDept) => {
        if (err) console.error("Audit fetch failed for department:", err);

        db.run("UPDATE departments SET name = ? WHERE id = ?", [newName, req.params.id], async (err) => {
            if (err) return res.status(500).json({ error: err.message });

            if (oldDept && oldDept.name !== newName) {
                await systemLog(null, "Update Department", `Department ID ${req.params.id} name changed: ${oldDept.name} -> ${newName}`, oldDept.name, newName);
            }
            res.json({ success: true });
        });
    });
});

app.delete('/api/departments/:id', (req, res) => {
    db.run("DELETE FROM departments WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- ROLES ---
app.get('/api/roles', (req, res) => {
    db.all("SELECT * FROM roles", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Map DB 'label' -> Frontend 'name' AND DB 'access' -> Frontend 'permissions'
        res.json(rows.map(r => ({
            id: r.id,
            name: r.label,
            permissions: JSON.parse(r.access)
        })));
    });
});

app.post('/api/roles', (req, res) => {
    // Map Frontend 'name' -> DB 'label' AND Frontend 'permissions' -> DB 'access'
    // Generate simple ID from name if not provided (slugify)
    const { name, permissions } = req.body;
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    db.run("INSERT INTO roles (id, label, access) VALUES (?, ?, ?)",
        [id, name, JSON.stringify(permissions)],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id });
        }
    );
});

app.put('/api/roles/:id', (req, res) => {
    const { name, permissions } = req.body;
    const newPermissionsJson = JSON.stringify(permissions);

    db.get("SELECT * FROM roles WHERE id = ?", [req.params.id], (err, oldRole) => {
        if (err) console.error("Audit fetch failed for role:", err);

        db.run("UPDATE roles SET label = ?, access = ? WHERE id = ?",
            [name, newPermissionsJson, req.params.id],
            async (err) => {
                if (err) return res.status(500).json({ error: err.message });

                if (oldRole) {
                    const changes = [];
                    if (oldRole.label !== name) changes.push(`Name: ${oldRole.label} -> ${name}`);
                    if (oldRole.access !== newPermissionsJson) changes.push(`Permissions changed`);

                    if (changes.length > 0) {
                        await systemLog(null, "Update Role", `Role ID ${req.params.id} updated: ${changes.join(', ')}`, JSON.stringify(oldRole), JSON.stringify({ id: req.params.id, name, permissions }));
                    }
                }
                res.json({ success: true });
            }
        );
    });
});

app.delete('/api/roles/:id', (req, res) => {
    db.run("DELETE FROM roles WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- OCR STATUS API ---
app.get('/api/ocr/status', async (req, res) => {
    try {
        const counts = await ocrQueue.getJobCounts('active', 'waiting', 'completed', 'failed');
        const activeJobs = await ocrQueue.getJobs(['active'], 0, 10, true); // Get first 10 active jobs

        const activeDetails = activeJobs.map(job => ({
            id: job.id,
            filename: job.data.originalName || 'Unknown File',
            progress: job.progress || 0,
            type: job.data.context?.type === 'inventory' ? 'Inventory' : 'Document'
        }));

        res.json({
            counts,
            activeJobs: activeDetails
        });
    } catch (error) {
        console.error("OCR Status Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// NEW: Reset OCR Queue Endpoint (Fix Stuck Jobs)
app.post('/api/ocr/reset', (req, res) => {
    db.run("UPDATE job_queue SET status = 'waiting' WHERE status = 'active'", [], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Queue reset successfully" });
    });
});

// --- INVENTORY ---
app.get('/api/inventory', (req, res) => {
    db.all("SELECT * FROM inventory ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Map data yang ada berdasarkan ID
        const rowMap = {};
        rows.forEach(r => { rowMap[r.id] = r; });

        const fullInventory = [];
        // Pastikan selalu ada 100 slot (Self-Healing jika ada baris yang hilang di DB)
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
                // Jika baris ID i tidak ada di DB (seperti kasus slot 2 hilang), buat data dummy EMPTY
                fullInventory.push({ id: i, status: 'EMPTY', boxData: null, history: [], lastUpdated: null });
            }
        }
        res.json(fullInventory);
    });
});

app.post('/api/inventory/move', (req, res) => {
    const { sourceId, targetId, user } = req.body;

    db.get("SELECT * FROM inventory WHERE id = ?", [sourceId], (err, source) => {
        if (err || !source) return res.status(500).json({ error: "Source slot not found" });
        if (source.status === 'EMPTY') return res.status(400).json({ error: "Source slot is empty" });

        db.get("SELECT * FROM inventory WHERE id = ?", [targetId], (err, target) => {
            if (err || !target) return res.status(500).json({ error: "Target slot not found" });
            if (target.status !== 'EMPTY') return res.status(400).json({ error: "Target slot is not empty" });

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

            db.run("UPDATE inventory SET status = ?, box_data = ?, boxData = NULL, history = ?, lastUpdated = ? WHERE id = ?",
                [source.status, boxData, JSON.stringify(targetHistory), now, targetId], (err) => {
                    if (err) return res.status(500).json({ error: err.message });

                    db.run("UPDATE inventory SET status = 'EMPTY', box_data = NULL, boxData = NULL, history = ?, lastUpdated = ? WHERE id = ?",
                        [JSON.stringify(sourceHistory), now, sourceId], (err2) => {
                            if (err2) return res.status(500).json({ error: err2.message });
                            res.json({ success: true });
                        });
                });
        });
    });
});

app.put('/api/inventory/:id', (req, res) => {
    // FIX: Support box_data (LONGTEXT) dari frontend
    let { status, lastUpdated, boxData, history, box_data } = req.body;
    status = (status || 'EMPTY').toUpperCase();

    // 1. Parse & Process Files to Disk
    let dataObj = null;
    try {
        const raw = box_data !== undefined ? box_data : boxData;
        console.log("Processing Inventory Payload:", typeof raw, raw ? "Raw Length: " + raw.length : "Raw is null");
        if (raw && typeof raw === 'string' && raw.includes('/uploads/')) {
            console.log("Payload contains /uploads/ path, confirming URL preservation.");
        }
        dataObj = typeof raw === 'string' ? JSON.parse(raw) : raw;
        dataObj = processInventoryFiles(dataObj, req.params.id);
        console.log("Processed DataObj Invoices:", JSON.stringify(dataObj?.ordners?.[0]?.invoices || []));
    } catch (e) { console.error("Error processing inventory files:", e); }

    // 2. Prepare for DB
    const boxDataToSave = dataObj ? JSON.stringify(dataObj) : null;
    const historyJson = JSON.stringify(history || []);

    // Fetch OLD value
    db.get("SELECT * FROM inventory WHERE id = ?", [req.params.id], (err, oldItem) => {
        if (err) return res.status(500).json({ error: err.message });

        // FIX: Primary Update - Save to box_data (LONGTEXT) and Clear boxData (legacy) to avoid confusion
        db.run("UPDATE inventory SET status = ?, lastUpdated = ?, box_data = ?, boxData = NULL, history = ? WHERE id = ?",
            [status, lastUpdated, boxDataToSave, historyJson, req.params.id],
            async (err) => {
                try {
                    if (err) {
                        // Fallback: Jika kolom box_data tidak ada, coba simpan ke boxData (Legacy)
                        if (err.message && err.message.includes("no such column")) {
                            console.warn("Column 'box_data' missing, falling back to 'boxData'. Please update DB schema.");
                            db.run("UPDATE inventory SET status = ?, lastUpdated = ?, boxData = ?, history = ? WHERE id = ?",
                                [status, lastUpdated, boxDataToSave, historyJson, req.params.id],
                                async (errFallback) => {
                                    try {
                                        if (errFallback) return res.status(500).json({ error: errFallback.message });
                                        await systemLog(req.body.modifiedBy || "System", "Update Inventory", `Update slot ${req.params.id} (Legacy Fallback)`);
                                        res.json({ success: true, id: req.params.id });
                                    } catch (e2) { console.error(e2); if (!res.headersSent) res.status(500).json({ error: e2.message }); }
                                }
                            );
                        } else {
                            return res.status(500).json({ error: err.message });
                        }
                    } else {
                        await systemLog(req.body.modifiedBy || "System", "Update Inventory", `Update slot ${req.params.id}`);
                        res.json({ success: true, id: req.params.id });
                    }
                } catch (e) {
                    console.error("Critical Error in Update Callback:", e);
                    if (!res.headersSent) res.status(500).json({ error: e.message });
                }
            }
        );
    });
});
app.get('/api/inventory/external', (req, res) => {
    db.all("SELECT * FROM external_items ORDER BY sentDate DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => {
            // Robust parsing
            let boxData = null;
            let history = [];
            try { boxData = r.boxData ? JSON.parse(r.boxData) : null; } catch (e) { }
            try { history = r.history ? JSON.parse(r.history) : []; } catch (e) { }
            return {
                ...r,
                boxData,
                box_data: boxData, // Add alias for consistency with new schema
                history
            };
        }));
    });
});

app.post('/api/inventory/external', (req, res) => {
    let { boxId, destination, sentDate, sender, boxData, history } = req.body;

    // Process files in boxData before saving
    if (boxData) {
        boxData = processInventoryFiles(boxData, 'EXT-' + boxId);
    }

    db.run("INSERT INTO external_items (boxId, destination, sentDate, sender, boxData, history) VALUES (?, ?, ?, ?, ?, ?)",
        [boxId, destination, sentDate, sender, JSON.stringify(boxData), JSON.stringify(history)],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.delete('/api/inventory/external/:id', (req, res) => {
    db.run("DELETE FROM external_items WHERE id = ?", [req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// --- LOGS ---
app.get('/api/logs', (req, res) => {
    db.all("SELECT * FROM logs ORDER BY id DESC LIMIT 100", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
            id: r.id,
            timestamp: r.timestamp,
            user: r.user,
            action: r.action,
            details: r.details
        })));
    });
});

// --- LOGGING HELPER ---
const systemLog = (user, action, details, oldValue = null, newValue = null) => {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString();
        db.run("INSERT INTO logs (timestamp, user, action, details, oldValue, newValue) VALUES (?, ?, ?, ?, ?, ?)",
            [timestamp, user || 'System', action, details, oldValue, newValue],
            (err) => {
                if (err) console.error("Logging failed:", err);
                resolve();
            }
        );
    });
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
app.get('/api/folders', (req, res) => {
    db.all("SELECT * FROM folders", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
            ...r,
            allowedDepts: JSON.parse(r.allowedDepts || '[]'),
            allowedUsers: JSON.parse(r.allowedUsers || '[]')
        })));
    });
});

app.post('/api/folders', (req, res) => {
    const { parentId, name, privacy, allowedDepts, allowedUsers, owner } = req.body;
    db.run("INSERT INTO folders (parentId, name, privacy, allowedDepts, allowedUsers, owner) VALUES (?, ?, ?, ?, ?, ?)",
        [parentId, name, privacy, JSON.stringify(allowedDepts || []), JSON.stringify(allowedUsers || []), owner],
        async function (err) {
            if (err) return res.status(500).json({ error: err.message });
            const newId = this.lastID;
            await systemLog(owner, "Folder", `Membuat folder baru: "${name}"`);
            res.json({ success: true, id: newId });
        }
    );
});

app.put('/api/folders/:id', (req, res) => {
    const { name, privacy, allowedDepts, allowedUsers } = req.body;
    db.run("UPDATE folders SET name = ?, privacy = ?, allowedDepts = ?, allowedUsers = ? WHERE id = ?",
        [name, privacy, JSON.stringify(allowedDepts), JSON.stringify(allowedUsers), req.params.id],
        async (err) => {
            if (err) return res.status(500).json({ error: err.message });
            await systemLog(null, "Folder", `Update folder: "${name}"`);
            res.json({ success: true });
        }
    );
});

app.delete('/api/folders/:id', (req, res) => {
    db.run("DELETE FROM folders WHERE id = ?", [req.params.id], async (err) => {
        if (err) return res.status(500).json({ error: err.message });
        await systemLog(null, "Folder", `Hapus folder ID: ${req.params.id}`);
        res.json({ success: true });
    });
});

// --- DOCUMENTS ---
app.get('/api/documents', (req, res) => {
    const { auditId, stepIndex, folderId } = req.query;
    // OPTIMIZATION: Exclude fileData (LONGTEXT) from list view for performance
    const columns = "id, title, type, size, uploadDate, url, folderId, department, owner, ocrContent, auditId, stepIndex, status, version, versionsHistory";
    let sql = `SELECT ${columns} FROM documents`;
    let params = [];
    let whereClauses = [];

    if (auditId) {
        whereClauses.push("auditId = ?");
        params.push(auditId);
    }
    if (folderId) {
        whereClauses.push("folderId = ?");
        params.push(folderId);
    }

    if (whereClauses.length > 0) {
        sql += " WHERE (" + whereClauses.join(" OR ") + ")";
        if (stepIndex !== undefined) {
            sql += " AND stepIndex = ?";
            params.push(stepIndex);
        }
    } else if (stepIndex !== undefined) {
        sql += " WHERE stepIndex = ?";
        params.push(stepIndex);
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/documents/:id', (req, res) => {
    db.get("SELECT * FROM documents WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Document not found" });
        res.json(row);
    });
});

import { getEmbedding, cosineSimilarity } from './semantic.js';
import Tesseract from 'tesseract.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import XLSX from 'xlsx';

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
        if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            console.log("Starting XLSX Text Extraction...");
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            let allText = "";
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                // Convert sheet to text (CSV-like but simple connection)
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
    const { id, title, type, size, uploadDate, url, folderId, department, owner, auditId, stepIndex, fileData, file_data, filedata } = req.body;
    // Support multiple casing for fileData
    const content = fileData || file_data || filedata;

    // --- AUTOMATIC REVISION CHECK ---
    // Check if a document with same name exists in the same folder
    const normalizedFolderId = (folderId === "null" || folderId === "") ? null : folderId;
    const checkSql = "SELECT * FROM documents WHERE title = ? AND (" + (normalizedFolderId ? "folderId = ?" : "folderId IS NULL") + ")";
    const checkParams = normalizedFolderId ? [title, normalizedFolderId] : [title];

    db.get(checkSql, checkParams, async (err, existingDoc) => {
        if (err) {
            console.error("Duplicate check error:", err);
            return res.status(500).json({ error: "Check duplicate failed" });
        }

        if (existingDoc) {
            console.log(`Duplicate found: ${title} in folder ${folderId || 'Root'}. Creating revision for ID: ${existingDoc.id}`);

            // Re-use versioning logic similar to PUT /api/documents/:id
            let versionsHistory = [];
            try { versionsHistory = existingDoc.versionsHistory ? JSON.parse(existingDoc.versionsHistory) : []; } catch (e) { }

            // Archive current version
            let archivedUrl = existingDoc.url;
            let archivedFileData = null;
            if (existingDoc.fileData && existingDoc.fileData.startsWith('data:')) {
                const ext = existingDoc.title.split('.').pop() || 'bin';
                const archivedPath = saveBase64ToFile(existingDoc.fileData, `ARCHIVE-${existingDoc.id}-${Date.now()}`, ext);
                if (archivedPath) archivedUrl = archivedPath;
                else archivedFileData = existingDoc.fileData;
            } else {
                archivedFileData = existingDoc.fileData;
            }

            versionsHistory.push({
                timestamp: existingDoc.uploadDate || new Date().toISOString(),
                size: existingDoc.size,
                type: existingDoc.type,
                fileData: archivedFileData,
                url: archivedUrl,
                title: existingDoc.title,
                user: existingDoc.owner || 'System'
            });

            // Save new file
            let fileUrl = url;
            let savedPath = null;
            let absoluteFilePath = null;
            let finalFileData = null;

            if (content) {
                const ext = title.split('.').pop() || 'bin';
                const savedUrl = saveBase64ToFile(content, existingDoc.id, ext);
                if (savedUrl) {
                    fileUrl = savedUrl;
                    savedPath = savedUrl;
                    absoluteFilePath = path.join(UPLOADS_DIR, path.basename(savedUrl));
                    finalFileData = null;
                } else {
                    finalFileData = content;
                }
            } else if (url && url.startsWith('/uploads/')) {
                absoluteFilePath = path.join(UPLOADS_DIR, path.basename(url));
            }

            const initialOcr = req.body.ocrContent || '';
            const status = initialOcr ? 'done' : 'processing';

            db.run("UPDATE documents SET type = ?, size = ?, uploadDate = ?, url = ?, ocrContent = ?, fileData = ?, versionsHistory = ?, version = COALESCE(version, 1) + 1, status = ? WHERE id = ?",
                [type, size, uploadDate, fileUrl, initialOcr, finalFileData, JSON.stringify(versionsHistory), status, existingDoc.id],
                async (updateErr) => {
                    if (updateErr) return res.status(500).json({ error: "Revision update failed: " + updateErr.message });

                    if (absoluteFilePath) {
                        try {
                            await addOCRJob(existingDoc.id, absoluteFilePath, type || 'application/octet-stream', title);
                        } catch (qErr) { console.error("Queue Error:", qErr); }
                    }

                    await systemLog(owner, "Revisi", `Otomatis membuat revisi: "${title}" v${existingDoc.version + 1}`);
                    res.json({ success: true, id: existingDoc.id, version: existingDoc.version + 1, isRevision: true });
                }
            );
            return;
        }

        // --- ORIGINAL INSERT LOGIC ---
        let fileUrl = url;
        let savedPath = null;
        let absoluteFilePath = null;
        let finalFileData = null;

        // 1. Save File (Base64 -> Disk)
        if (content) {
            const ext = title.split('.').pop() || 'bin';
            const savedUrl = saveBase64ToFile(content, id, ext);

            if (savedUrl) {
                fileUrl = savedUrl;
                savedPath = savedUrl;
                absoluteFilePath = path.join(UPLOADS_DIR, path.basename(savedUrl));
                finalFileData = null;
            } else {
                finalFileData = content;
            }
        } else if (url && url.startsWith('/uploads/')) {
            absoluteFilePath = path.join(UPLOADS_DIR, path.basename(url));
        }

        const initialOcr = req.body.ocrContent || '';
        const status = initialOcr ? 'done' : 'processing';

        db.run("INSERT INTO documents (id, title, type, size, uploadDate, url, folderId, department, owner, ocrContent, auditId, stepIndex, fileData, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [id, title, type, size, uploadDate, fileUrl, folderId, department, owner, initialOcr, auditId, stepIndex, finalFileData, status],
            async (err) => {
                if (err) {
                    console.error("DB INSERT ERROR:", err.message);
                    return res.status(500).json({ error: "Database Insert Failed: " + err.message });
                }

                if (absoluteFilePath) {
                    try {
                        await addOCRJob(id, absoluteFilePath, type || 'application/octet-stream', title);
                    } catch (qErr) {
                        console.error("Queue Error:", qErr);
                    }
                }

                await systemLog(owner, "Upload", `Mengunggah dokumen (Queued): "${title}"`);

                res.json({
                    id, title, type, size, uploadDate, url: fileUrl, folderId, department, owner,
                    ocrContent: initialOcr, auditId, stepIndex, status: 'processing'
                });
            }
        );
    });
});

app.put('/api/documents/:id', (req, res) => {
    const { title, folderId, department, ocrContent, fileData, file_data, filedata } = req.body;
    const content = fileData || file_data || filedata;

    // Generate Embedding (Async)
    const textToEmbed = (title + " " + (ocrContent || "")).substring(0, 1000);
    getEmbedding(textToEmbed).then(vector => {
        if (vector) {
            db.run("UPDATE documents SET vector = ? WHERE id = ?", [JSON.stringify(vector), req.params.id], (err) => {
                if (err) console.error("Failed to save vector:", err);
            });
        }
    });

    if (content) {
        // ... (rest of the PUT logic remains similar, see context)
        db.get("SELECT * FROM documents WHERE id = ?", [req.params.id], (err, oldDoc) => {
            if (err) return res.status(500).json({ error: err.message });

            let versionsHistory = [];
            try { versionsHistory = oldDoc && oldDoc.versionsHistory ? JSON.parse(oldDoc.versionsHistory) : []; } catch (e) { }

            if (oldDoc) {
                // ... (archiving logic)
                let archivedUrl = oldDoc.url;
                let archivedFileData = null;
                if (oldDoc.fileData && oldDoc.fileData.startsWith('data:')) {
                    const ext = oldDoc.title.split('.').pop() || 'bin';
                    const archivedPath = saveBase64ToFile(oldDoc.fileData, `ARCHIVE-${req.params.id}-${Date.now()}`, ext);
                    if (archivedPath) archivedUrl = archivedPath;
                    else archivedFileData = oldDoc.fileData;
                } else {
                    archivedFileData = oldDoc.fileData;
                }

                versionsHistory.push({
                    timestamp: oldDoc.uploadDate || new Date().toISOString(),
                    size: oldDoc.size,
                    type: oldDoc.type,
                    fileData: archivedFileData,
                    url: archivedUrl,
                    title: oldDoc.title,
                    user: oldDoc.owner || 'System'
                });
            }

            const ext = title.split('.').pop() || 'bin';
            const newSavedUrl = saveBase64ToFile(content, req.params.id, ext);
            const finalUrl = newSavedUrl || req.body.url || oldDoc.url;
            const finalFileData = newSavedUrl ? null : content;

            db.run("UPDATE documents SET title = ?, folderId = ?, department = ?, ocrContent = ?, fileData = ?, url = ?, versionsHistory = ?, version = COALESCE(version, 1) + 1, status = ? WHERE id = ?",
                [title, folderId, department, ocrContent, finalFileData, finalUrl, JSON.stringify(versionsHistory), ocrContent ? 'done' : 'processing', req.params.id],
                async (err) => {
                    if (err) return res.status(500).json({ error: err.message });

                    // Add Job for revision
                    if (newSavedUrl) {
                        const absolutePath = path.join(UPLOADS_DIR, path.basename(newSavedUrl));
                        addOCRJob(req.params.id, absolutePath, req.body.type || 'application/octet-stream', title);
                    }

                    await systemLog(null, "Update/Version", `Update file & save version: "${title}"`);
                    res.json({ success: true });
                }
            );
        });
    } else {
        // Metadata only update
        db.run("UPDATE documents SET title = ?, folderId = ?, department = ?, ocrContent = ? WHERE id = ?",
            [title, folderId, department, ocrContent, req.params.id],
            async (err) => {
                if (err) return res.status(500).json({ error: err.message });
                await systemLog(null, "Rename", `Ganti nama/meta file: "${title}"`);
                res.json({ success: true });
            }
        );
    }
});


// --- MANAGEMENT OPS (COPY/MOVE) ---
app.post('/api/documents/copy', (req, res) => {
    const { id, targetFolderId } = req.body;
    db.get("SELECT * FROM documents WHERE id = ?", [id], (err, doc) => {
        if (err || !doc) return res.status(500).json({ error: err ? err.message : "Document not found" });
        const newId = String(Date.now()) + "_" + Math.floor(Math.random() * 1000);
        const newDoc = { ...doc, id: newId, folderId: targetFolderId, title: "Copy of " + doc.title, uploadDate: new Date().toISOString() };
        db.run("INSERT INTO documents (id, title, type, size, uploadDate, url, folderId, department, owner, ocrContent, auditId, stepIndex, fileData) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [newDoc.id, newDoc.title, newDoc.type, newDoc.size, newDoc.uploadDate, newDoc.url, newDoc.folderId, newDoc.department, newDoc.owner, newDoc.ocrContent, newDoc.auditId, newDoc.stepIndex, doc.fileData],
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

app.delete('/api/documents/:id', (req, res) => {
    db.get("SELECT * FROM documents WHERE id = ?", [req.params.id], (err, doc) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!doc) return res.status(404).json({ error: "Document not found" });

        // Delete main file if exists on disk
        if (doc.url && doc.url.startsWith('/uploads/')) {
            const filePath = path.join(UPLOADS_DIR, path.basename(doc.url));
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // Sync is fine for delete
                console.log("Deleted file from disk:", filePath);
            }
        }

        // OPTIONAL: Clean up version history files? 
        // For now, keep them as "Archive" or implement lazy cleanup later.

        db.run("DELETE FROM documents WHERE id = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

app.post('/api/documents/:id/restore', (req, res) => {
    const { versionTimestamp } = req.body;

    db.get("SELECT * FROM documents WHERE id = ?", [req.params.id], (err, doc) => {
        if (err || !doc) return res.status(404).json({ error: "Document not found" });

        let versions = [];
        try { versions = JSON.parse(doc.versionsHistory || '[]'); } catch (e) { }

        const versionToRestore = versions.find(v => v.timestamp === versionTimestamp);
        if (!versionToRestore) return res.status(404).json({ error: "Version not found" });

        // Backup current before restore
        let currentArchivedUrl = doc.url;
        let currentArchivedData = null;

        if (doc.fileData && doc.fileData.startsWith('data:')) {
            // If current is BLOB, migrate to disk before archiving
            const ext = doc.title.split('.').pop() || 'bin';
            const archivedPath = saveBase64ToFile(doc.fileData, `ARCHIVE-${req.params.id}-${Date.now()}`, ext);
            if (archivedPath) currentArchivedUrl = archivedPath;
            else currentArchivedData = doc.fileData;
        } else {
            currentArchivedData = doc.fileData;
        }

        versions.push({
            timestamp: doc.uploadDate || new Date().toISOString(),
            size: doc.size,
            type: doc.type,
            fileData: currentArchivedData,
            url: currentArchivedUrl,
            title: doc.title,
            user: doc.owner || 'System',
            restoredFrom: versionTimestamp
        });

        // Perform Restore
        // If restoring a BLOB version, we could migrate it now, but respecting the history format is safer.
        // If restoring a File version, fileData is null, url is set.
        const newUrl = versionToRestore.url || doc.url; // Use restored URL or keep current if undefined (legacy)
        const newFileData = versionToRestore.fileData || null;

        const absoluteFilePath = newUrl && newUrl.startsWith('/uploads/')
            ? path.join(UPLOADS_DIR, path.basename(newUrl))
            : null;

        db.run("UPDATE documents SET fileData = ?, url = ?, size = ?, type = ?, versionsHistory = ?, version = COALESCE(version, 1) + 1, status = ?, ocrContent = '' WHERE id = ?",
            [newFileData, newUrl, versionToRestore.size, versionToRestore.type, JSON.stringify(versions), absoluteFilePath ? 'processing' : 'ready', req.params.id],
            async (err) => {
                if (err) return res.status(500).json({ error: err.message });

                if (absoluteFilePath) {
                    try {
                        await addOCRJob(req.params.id, absoluteFilePath, versionToRestore.type || 'application/octet-stream', doc.title);
                    } catch (qErr) { console.error("Queue Error:", qErr); }
                }

                await systemLog(null, "Restore Version", `Restore file "${doc.title}" ke versi ${new Date(versionTimestamp).toLocaleString()}`);
                res.json({ success: true });
            }
        );
    });
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
app.get('/api/tax-summaries', (req, res) => {
    db.all("SELECT * FROM tax_summaries", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
            ...r,
            data: typeof r.data === 'string' ? JSON.parse(r.data || '{}') : (r.data || {})
        })));
    });
});

app.post('/api/tax-summaries', (req, res) => {
    const { id, type, month, year, pembetulan, data } = req.body;
    db.run("INSERT INTO tax_summaries (id, type, month, year, pembetulan, data) VALUES (?, ?, ?, ?, ?, ?)",
        [id || Date.now().toString(), type, month, year, pembetulan || 0, JSON.stringify(data)],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/tax-summaries/:id', (req, res) => {
    const { type, month, year, pembetulan, data } = req.body;
    db.run("UPDATE tax_summaries SET type = ?, month = ?, year = ?, pembetulan = ?, data = ? WHERE id = ?",
        [type, month, year, pembetulan, JSON.stringify(data), req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/tax-summaries/:id', (req, res) => {
    db.run("DELETE FROM tax_summaries WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- TAX OBJECTS (DATABASE WP) ---
// Table is created in db.js initDb()

app.get('/api/tax-objects', (req, res) => {
    db.all("SELECT * FROM tax_objects ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/tax-objects', (req, res) => {
    const { idType, identityNumber, name, email, taxType, taxObjectCode, taxObjectName, dpp, rate, pph, ppn, totalPayable, discount, dppNet } = req.body;

    // Logic: Check for exact match (NPWP + Type + Code) or empty match (NPWP with no Type/Code)
    db.all("SELECT id, tax_type, tax_object_code FROM tax_objects WHERE identity_number = ?", [identityNumber], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const exactMatch = rows.find(r => String(r.tax_type) === String(taxType) && String(r.tax_object_code) === String(taxObjectCode));
        const emptyMatch = rows.find(r => !r.tax_type || r.tax_type === '' || !r.tax_object_code || r.tax_object_code === '');

        if (exactMatch || emptyMatch) {
            const targetId = exactMatch ? exactMatch.id : emptyMatch.id;
            db.run(`UPDATE tax_objects SET 
                id_type = ?, name = ?, email = ?, tax_type = ?, 
                tax_object_code = ?, tax_object_name = ?, dpp = ?, rate = ?, pph = ?, ppn = ?, total_payable = ?, discount = ?, dpp_net = ?
                WHERE id = ?`,
                [idType, name, email, taxType, taxObjectCode, taxObjectName, dpp, rate, pph, ppn, totalPayable, discount, dppNet, targetId],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, id: targetId, updated: true });
                }
            );
        } else {
            db.run(`INSERT INTO tax_objects (
                id_type, identity_number, name, email, tax_type, 
                tax_object_code, tax_object_name, dpp, rate, pph, ppn, total_payable, discount, dpp_net
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [idType, identityNumber, name, email, taxType, taxObjectCode, taxObjectName, dpp, rate, pph, ppn, totalPayable, discount, dppNet],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, id: this.lastID });
                }
            );
        }
    });
});

app.put('/api/tax-objects/:id', (req, res) => {
    const { idType, identityNumber, name, email, taxType, taxObjectCode, taxObjectName, dpp, rate, pph, ppn, totalPayable, discount, dppNet } = req.body;

    db.run(`UPDATE tax_objects SET 
        id_type = ?, identity_number = ?, name = ?, email = ?, tax_type = ?, 
        tax_object_code = ?, tax_object_name = ?, dpp = ?, rate = ?, pph = ?, ppn = ?, total_payable = ?, discount = ?, dpp_net = ?
        WHERE id = ?`,
        [idType, identityNumber, name, email, taxType, taxObjectCode, taxObjectName, dpp, rate, pph, ppn, totalPayable, discount, dppNet, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/tax-objects-all', (req, res) => {
    db.run("DELETE FROM tax_objects", [], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Seluruh data database WP telah dihapus." });
    });
});

app.delete('/api/tax-objects/:id', (req, res) => {
    db.run("DELETE FROM tax_objects WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
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

app.post('/api/documents/:id/promote-comment-attachment', (req, res) => {
    const { commentId } = req.body;
    const docId = req.params.id;

    db.get("SELECT * FROM comments WHERE id = ?", [commentId], (err, comment) => {
        if (err || !comment || !comment.attachmentUrl) return res.status(404).json({ error: "Attachment not found" });

        db.get("SELECT * FROM documents WHERE id = ?", [docId], (err, doc) => {
            if (err || !doc) return res.status(404).json({ error: "Document not found" });

            let versionsHistory = [];
            try { versionsHistory = JSON.parse(doc.versionsHistory || '[]'); } catch (e) { }

            versionsHistory.push({
                timestamp: doc.uploadDate || new Date().toISOString(),
                size: doc.size,
                type: doc.type,
                fileData: doc.fileData,
                url: doc.url,
                title: doc.title,
                user: doc.owner || 'System'
            });

            const absoluteFilePath = path.join(UPLOADS_DIR, path.basename(comment.attachmentUrl));

            db.run("UPDATE documents SET url = ?, type = ?, size = ?, title = ?, uploadDate = ?, versionsHistory = ?, version = COALESCE(version, 1) + 1, status = 'processing', fileData = NULL, ocrContent = '' WHERE id = ?",
                [comment.attachmentUrl, comment.attachmentType, comment.attachmentSize, comment.attachmentName, new Date().toISOString(), JSON.stringify(versionsHistory), docId],
                async (updateErr) => {
                    if (updateErr) return res.status(500).json({ error: updateErr.message });
                    try {
                        await addOCRJob(docId, absoluteFilePath, comment.attachmentType, comment.attachmentName);
                    } catch (qErr) { console.error("Queue Error:", qErr); }
                    res.json({ success: true });
                }
            );
        });
    });
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
