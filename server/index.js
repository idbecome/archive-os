import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import db from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const app = express();
const PORT = 5000;

console.log('--- ARCHIVE-OS BACKEND v2.1 (WATCHER ENABLED) STARTING ---');
// Trigger restart for re-seeding

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Helper: Save Base64 to File
function saveBase64ToFile(base64Data, id, extension = 'bin') {
    try {
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            // Not a base64 string, maybe already a path or raw content?
            // If it doesn't look like base64, assume it's legacy content or invalid.
            // For safety, we can return null or try to write raw.
            // Let's assume valid base64 is sent from frontend.
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

    // Fetch OLD value
    db.get("SELECT * FROM inventory WHERE id = ?", [req.params.id], (err, oldItem) => {
        if (err) console.error("Audit fetch failed", err);

        db.run("UPDATE inventory SET status = ?, lastUpdated = ?, boxData = ?, history = ? WHERE id = ?",
            [status, lastUpdated, boxDataJson, historyJson, req.params.id],
            async (err) => {
                if (err) return res.status(500).json({ error: err.message });

                // Audit Log
                if (oldItem && oldItem.status !== status) {
                    await systemLog(null, "Inventory Update", `Slot #${req.params.id} Status: ${oldItem.status} -> ${status}`, oldItem.status, status);
                }

                db.all("SELECT * FROM inventory", [], (err, rows) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json(rows.map(r => ({
                        ...r,
                        boxData: JSON.parse(r.boxData || '{}'),
                        history: JSON.parse(r.history || '[]')
                    })));
                });
            }
        );
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

    let fileUrl = url;
    let savedPath = null;
    let finalFileData = null; // Don't save base64 to DB

    if (content) {
        // Determine extension
        const ext = title.split('.').pop() || 'bin';
        const savedUrl = saveBase64ToFile(content, id, ext);
        if (savedUrl) {
            fileUrl = savedUrl;
            savedPath = savedUrl;
        } else {
            console.warn("Failed to save file to disk, falling back to legacy DB storage (not recommended)");
            finalFileData = content;
        }
    }

    db.run("INSERT INTO documents (id, title, type, size, uploadDate, url, folderId, department, owner, ocrContent, auditId, stepIndex, fileData) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, title, type, size, uploadDate, fileUrl, folderId, department, owner, ocrContent, auditId, stepIndex, finalFileData],
        async (err) => {
            if (err) return res.status(500).json({ error: err.message });
            await systemLog(owner, "Upload", `Mengunggah dokumen: "${title}" (Storage: ${savedPath ? 'Disk' : 'DB'})`);
            res.json({ success: true, url: fileUrl });
        }
    );
});

app.put('/api/documents/:id', (req, res) => {
    const { title, folderId, department, ocrContent, fileData, file_data, filedata } = req.body;
    const content = fileData || file_data || filedata;

    if (content) {
        // Full update with file content -> SAVE VERSION
        db.get("SELECT * FROM documents WHERE id = ?", [req.params.id], (err, oldDoc) => {
            if (err) return res.status(500).json({ error: err.message });

            let versionsHistory = [];
            try {
                versionsHistory = oldDoc && oldDoc.versionsHistory ? JSON.parse(oldDoc.versionsHistory) : [];
            } catch (e) { }

            // Save OLD version
            if (oldDoc) {
                let archivedUrl = oldDoc.url;
                let archivedFileData = null;

                // MIGRATION: If old doc has BLOB data, save it to disk now to free up DB space for history
                if (oldDoc.fileData && oldDoc.fileData.startsWith('data:')) {
                    const ext = oldDoc.title.split('.').pop() || 'bin';
                    const archivedPath = saveBase64ToFile(oldDoc.fileData, `ARCHIVE-${req.params.id}-${Date.now()}`, ext);
                    if (archivedPath) {
                        archivedUrl = archivedPath; // Point to new disk file
                        console.log("Migrated old version to disk:", archivedPath);
                    } else {
                        archivedFileData = oldDoc.fileData; // Fallback: keep BLOB if save fails
                    }
                } else if (oldDoc.fileData) {
                    // Non-base64 data? Keep it.
                    archivedFileData = oldDoc.fileData;
                }

                versionsHistory.push({
                    timestamp: oldDoc.uploadDate || new Date().toISOString(),
                    size: oldDoc.size,
                    type: oldDoc.type,
                    fileData: archivedFileData, // Should be null if migrated
                    url: archivedUrl,           // Should point to disk if migrated or already there
                    title: oldDoc.title,
                    user: oldDoc.owner || 'System'
                });
            }

            // Save NEW version
            const ext = title.split('.').pop() || 'bin';
            const newSavedUrl = saveBase64ToFile(content, req.params.id, ext);
            const finalUrl = newSavedUrl || url || oldDoc.url;
            const finalFileData = newSavedUrl ? null : content; // Fallback to BLOB if save failed

            db.run("UPDATE documents SET title = ?, folderId = ?, department = ?, ocrContent = ?, fileData = ?, url = ?, versionsHistory = ?, version = version + 1 WHERE id = ?",
                [title, folderId, department, ocrContent, finalFileData, finalUrl, JSON.stringify(versionsHistory), req.params.id],
                async (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    await systemLog(null, "Update/Version", `Update file & save version: "${title}" (Storage: ${newSavedUrl ? 'Disk' : 'DB'})`);
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

        db.run("UPDATE documents SET fileData = ?, url = ?, size = ?, type = ?, versionsHistory = ?, version = version + 1 WHERE id = ?",
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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
