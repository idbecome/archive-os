import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import db from './db.js';

const app = express();
const PORT = 5000;

console.log('--- ARCHIVE-OS BACKEND v2.1 (WATCHER ENABLED) STARTING ---');
// Trigger restart for re-seeding

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

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
    db.run("UPDATE users SET username = ?, password = ?, name = ?, role = ?, department = ? WHERE id = ?",
        [username, password, name, role, department, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
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
    db.run("UPDATE departments SET name = ? WHERE id = ?", [req.body.name, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
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
    db.run("UPDATE roles SET label = ?, access = ? WHERE id = ?",
        [name, JSON.stringify(permissions), req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/roles/:id', (req, res) => {
    db.run("DELETE FROM roles WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- INVENTORY ---
app.get('/api/inventory', (req, res) => {
    db.all("SELECT * FROM inventory", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => {
            // Robust Mapping for redundant columns
            const rawBoxData = r.boxData || r.box_data || r.boxdata;
            const rawHistory = r.history || r.history_data; // in case of future changes
            const rawLastUpdated = r.lastUpdated || r.last_updated || r.lastupdated;

            return {
                ...r,
                status: (r.status || 'EMPTY').toUpperCase(),
                lastUpdated: rawLastUpdated,
                boxData: rawBoxData ? (typeof rawBoxData === 'string' ? JSON.parse(rawBoxData) : rawBoxData) : null,
                history: rawHistory ? (typeof rawHistory === 'string' ? JSON.parse(rawHistory) : rawHistory) : []
            };
        }));
    });
});

app.put('/api/inventory/:id', (req, res) => {
    let { status, lastUpdated, boxData, history } = req.body;
    status = (status || 'EMPTY').toUpperCase();
    const boxDataJson = JSON.stringify(boxData);
    const historyJson = JSON.stringify(history);

    db.run(
        "UPDATE inventory SET status = ?, lastUpdated = ?, last_updated = ?, boxData = ?, box_data = ?, history = ? WHERE id = ?",
        [status, lastUpdated, lastUpdated, boxDataJson, boxDataJson, historyJson, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// --- EXTERNAL ITEMS (INDOARSIP) ---
app.get('/api/inventory/external', (req, res) => {
    db.all("SELECT * FROM external_items ORDER BY sentDate DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
            ...r,
            boxData: JSON.parse(r.boxData || '{}'),
            history: JSON.parse(r.history || '[]')
        })));
    });
});

app.post('/api/inventory/external', (req, res) => {
    const { boxId, destination, sentDate, sender, boxData, history } = req.body;
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
function systemLog(user, action, details) {
    const timestamp = new Date().toISOString();
    return new Promise((resolve, reject) => {
        db.run("INSERT INTO logs (timestamp, user, action, details) VALUES (?, ?, ?, ?)",
            [timestamp, user || 'System', action, details],
            (err) => err ? reject(err) : resolve()
        );
    });
}

app.post('/api/logs', (req, res) => {
    const { user, action, details } = req.body;
    const timestamp = new Date().toISOString();
    db.run("INSERT INTO logs (timestamp, user, action, details) VALUES (?, ?, ?, ?)",
        [timestamp, user, action, details],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
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
    const columns = "id, title, type, size, uploadDate, url, folderId, department, owner, ocrContent, auditId, stepIndex";
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

app.post('/api/documents', (req, res) => {
    const { id, title, type, size, uploadDate, url, folderId, department, owner, ocrContent, auditId, stepIndex, fileData, file_data, filedata } = req.body;
    // Support multiple casing for fileData
    const content = fileData || file_data || filedata;

    db.run("INSERT INTO documents (id, title, type, size, uploadDate, url, folderId, department, owner, ocrContent, auditId, stepIndex, fileData) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, title, type, size, uploadDate, url, folderId, department, owner, ocrContent, auditId, stepIndex, content],
        async (err) => {
            if (err) return res.status(500).json({ error: err.message });
            await systemLog(owner, "Upload", `Mengunggah dokumen: "${title}"`);
            res.json({ success: true });
        }
    );
});

app.put('/api/documents/:id', (req, res) => {
    const { title, folderId, department, ocrContent, fileData, file_data, filedata } = req.body;
    const content = fileData || file_data || filedata;

    if (content) {
        // Full update with file content
        db.run("UPDATE documents SET title = ?, folderId = ?, department = ?, ocrContent = ?, fileData = ? WHERE id = ?",
            [title, folderId, department, ocrContent, content, req.params.id],
            async (err) => {
                if (err) return res.status(500).json({ error: err.message });
                await systemLog(null, "Rename/Update", `Update file: "${title}"`);
                res.json({ success: true });
            }
        );
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
    db.run("DELETE FROM documents WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
