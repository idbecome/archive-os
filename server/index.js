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

// Configure Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        // Safe filename: INV-timestamp-originalName
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `INV-${uniqueSuffix}-${safeName}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const app = express();
const PORT = 5000;

console.log('--- ARCHIVE-OS BACKEND v2.1 (WATCHER ENABLED) STARTING ---');
// Trigger restart for re-seeding

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
// Dedicated Upload Endpoint
app.use('/uploads', express.static(UPLOADS_DIR));

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    console.log(`File uploaded via Multer: ${fileUrl}`);
    res.json({ success: true, url: fileUrl });
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

    const results = [];

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
                if (doc.title.toLowerCase().includes(query)) score += 0.5;
                if (doc.ocrContent && doc.ocrContent.toLowerCase().includes(query)) score += 0.3;
                // Exact match bonus
                if (doc.title.toLowerCase() === query) score += 0.5;

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
                    if (String(record.pph23).includes(query)) { score += 0.4; found = true; }
                    if (String(record.pph42).includes(query)) { score += 0.4; found = true; }
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

    Promise.all([docPromise, invPromise, extPromise, taxSumPromise]).then(([docs, invs, exts, taxSums]) => {
        // Merge and Sort by Score
        const allResults = [...docs, ...invs, ...exts, ...taxSums].sort((a, b) => b.score - a.score);
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
    db.all("SELECT * FROM inventory", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => {
            // Robust Mapping for redundant columns - Prioritize LONGTEXT box_data
            const rawBoxData = r.box_data || r.boxData || r.boxdata;
            const historyStr = r.history || '[]';
            const rawLastUpdated = r.lastUpdated || r.last_updated || r.lastupdated;

            // FIX: Safe JSON Parse untuk menangani data yang terpotong/corrupt
            let parsedBoxData = null;
            if (rawBoxData) {
                try {
                    parsedBoxData = typeof rawBoxData === 'string' ? JSON.parse(rawBoxData) : rawBoxData;
                } catch (e) {
                    console.warn(`Warning: Corrupt JSON in slot ${r.id} (likely truncated). Data reset to null.`);
                    parsedBoxData = null;
                }
            }

            let parsedHistory = [];
            if (historyStr) {
                try {
                    parsedHistory = typeof historyStr === 'string' ? JSON.parse(historyStr) : historyStr;
                } catch (e) {
                    parsedHistory = [];
                }
            }

            return {
                ...r,
                status: (r.status || 'EMPTY').toUpperCase(),
                lastUpdated: rawLastUpdated,
                boxData: parsedBoxData,
                history: parsedHistory
            };
        }));
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
    const columns = "id, title, type, size, uploadDate, url, folderId, department, owner, ocrContent, auditId, stepIndex, status";
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

app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);

    console.log("Semantic Search Query:", q);

    // 1. Generate Query Vector
    const queryVector = await getEmbedding(q);
    if (!queryVector) return res.status(500).json({ error: "Embedding generation failed" });

    // 2. Fetch all document vectors
    const sql = `
        SELECT d.id, d.title, d.type, d.size, d.uploadDate, d.vector, d.folderId, f.name as folderName 
        FROM documents d
        LEFT JOIN folders f ON d.folderId = f.id
    `;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const results = rows.map(doc => {
            if (!doc.vector) return { ...doc, score: 0 };
            try {
                const docVector = JSON.parse(doc.vector);
                const score = cosineSimilarity(queryVector, docVector);
                return { ...doc, score };
            } catch (e) { return { ...doc, score: 0 }; }
        })
            .filter(doc => doc.score > 0.2) // Threshold
            .sort((a, b) => b.score - a.score)
            .slice(0, 5); // Top 5

        res.json(results);
    });
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

        db.run("UPDATE documents SET fileData = ?, url = ?, size = ?, type = ?, versionsHistory = ?, version = COALESCE(version, 1) + 1, status = 'ready' WHERE id = ?",
            [newFileData, newUrl, versionToRestore.size, versionToRestore.type, JSON.stringify(versions), req.params.id],
            async (err) => {
                if (err) return res.status(500).json({ error: err.message });
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
            ppnIn: JSON.parse(r.ppnIn || '{}'),
            ppnOut: JSON.parse(r.ppnOut || '{}'),
            extraPph: JSON.parse(r.extraPph || '[]'),
            extraPpnIn: JSON.parse(r.extraPpnIn || '[]'),
            extraPpnOut: JSON.parse(r.extraPpnOut || '[]')
        })));
    });
});

app.post('/api/tax-summaries', (req, res) => {
    const { month, year, pph23, pph42, pph26, ppnIn, ppnOut, extraPph, extraPpnIn, extraPpnOut } = req.body;
    db.run("INSERT INTO tax_summaries (month, year, pph23, pph42, pph26, ppnIn, ppnOut, extraPph, extraPpnIn, extraPpnOut) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [month, year, pph23, pph42, pph26, JSON.stringify(ppnIn), JSON.stringify(ppnOut), JSON.stringify(extraPph), JSON.stringify(extraPpnIn), JSON.stringify(extraPpnOut)],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/tax-summaries/:id', (req, res) => {
    const { month, year, pph23, pph42, pph26, ppnIn, ppnOut, extraPph, extraPpnIn, extraPpnOut } = req.body;
    db.run("UPDATE tax_summaries SET month = ?, year = ?, pph23 = ?, pph42 = ?, pph26 = ?, ppnIn = ?, ppnOut = ?, extraPph = ?, extraPpnIn = ?, extraPpnOut = ? WHERE id = ?",
        [month, year, pph23, pph42, pph26, JSON.stringify(ppnIn), JSON.stringify(ppnOut), JSON.stringify(extraPph), JSON.stringify(extraPpnIn), JSON.stringify(extraPpnOut), req.params.id],
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
    const { idType, identityNumber, name, taxType, taxObjectCode, taxObjectName, dpp, rate, pph } = req.body;

    db.run(`INSERT INTO tax_objects (
        id_type, identity_number, name, tax_type, 
        tax_object_code, tax_object_name, dpp, rate, pph
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [idType, identityNumber, name, taxType, taxObjectCode, taxObjectName, dpp, rate, pph],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.put('/api/tax-objects/:id', (req, res) => {
    const { idType, identityNumber, name, taxType, taxObjectCode, taxObjectName, dpp, rate, pph } = req.body;

    db.run(`UPDATE tax_objects SET 
        id_type = ?, identity_number = ?, name = ?, tax_type = ?, 
        tax_object_code = ?, tax_object_name = ?, dpp = ?, rate = ?, pph = ?
        WHERE id = ?`,
        [idType, identityNumber, name, taxType, taxObjectCode, taxObjectName, dpp, rate, pph, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
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
            'Tanggal': item.created_at,
            'Jenis ID': item.id_type,
            'Nomor Identitas': item.identity_number,
            'Nama Wajib Pajak': item.name,
            'Jenis PPh': item.tax_type,
            'Kode Objek': item.tax_object_code,
            'Nama Objek': item.tax_object_name,
            'DPP': item.dpp,
            'Tarif (%)': item.rate,
            'Total PPh': item.pph
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Adjust column widths
        ws['!cols'] = [
            { wch: 20 }, // Tanggal
            { wch: 10 }, // Jenis ID
            { wch: 20 }, // Nomor Identitas
            { wch: 30 }, // Nama Wajib Pajak
            { wch: 10 }, // Jenis PPh
            { wch: 15 }, // Kode Objek
            { wch: 35 }, // Nama Objek
            { wch: 15 }, // DPP
            { wch: 10 }, // Tarif (%)
            { wch: 15 }  // Total PPh
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
        ['Jenis ID', 'Nomor Identitas', 'Nama Wajib Pajak', 'Jenis PPh', 'Kode Objek', 'Nama Objek', 'DPP', 'Tarif (%)', 'Total PPh'],
        ['NPWP', '01.234.567.8-901.000', 'PT Contoh Sejahtera', '23', '24-100-02', 'Jasa Teknik', 10000000, 2, 200000],
        ['KTP', '3201234567890001', 'Budi Santoso', '21', '21-100-01', 'Upah Pegawai', 5000000, 5, 250000]
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

        const insertData = [];
        data.forEach(row => {
            const idType = row['Jenis ID'] || 'NPWP';
            const idNumber = row['Nomor Identitas'] || '';
            const name = row['Nama Wajib Pajak'] || '';
            const taxType = row['Jenis PPh'] || '23';
            const code = row['Kode Objek'] || '';
            const objName = row['Nama Objek'] || '';
            const dpp = Number(row['DPP']) || 0;
            const rate = Number(row['Tarif (%)']) || 0;
            const pph = Number(row['Total PPh']) || 0;

            if (name) {
                insertData.push([idType, idNumber, name, taxType, code, objName, dpp, rate, pph]);
            }
        });

        if (insertData.length === 0) {
            return res.json({ success: true, count: 0, message: "Tidak ada data valid untuk diimpor." });
        }

        const sql = `INSERT INTO tax_objects (id_type, identity_number, name, tax_type, tax_object_code, tax_object_name, dpp, rate, pph) VALUES ?`;
        
        db.run(sql, [insertData], function (err) {
            if (err) {
                console.error("Import error:", err);
                return res.status(500).json({ error: 'Gagal mengimpor data: ' + err.message });
            }
            res.json({ success: true, count: insertData.length, message: `Berhasil mengimpor ${insertData.length} data ke Database WP!` });
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

        // Expected headers based on template: 'Jenis PPh', 'Kode Objek Pajak', 'Nama Objek Pajak', 'Keterangan'

        const insertData = [];
        data.forEach(row => {
            const taxType = row['Jenis PPh'];
            const code = row['Kode Objek Pajak'];
            const name = row['Nama Objek Pajak'];
            const rate = row['Tarif (%)'];
            const note = row['Keterangan'];

            if (taxType && code && name) {
                insertData.push([taxType, code, name, rate, note]);
            }
        });

        if (insertData.length === 0) {
            return res.json({ success: true, count: 0, message: "Tidak ada data valid untuk diimpor." });
        }

        const sql = "INSERT INTO master_tax_objects (tax_type, code, name, rate, note) VALUES ?";
        db.run(sql, [insertData], function (err) {
            if (err) {
                console.error("Import error:", err);
                return res.status(500).json({ error: 'Gagal mengimpor data: ' + err.message });
            }
            res.json({ success: true, count: insertData.length, message: `Berhasil mengimpor ${insertData.length} data objek pajak!` });
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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
