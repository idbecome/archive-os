import express from 'express';
import cors from 'cors';
import fs from 'fs';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { knex, initDb } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io'; // Still need IO for real-time?

// Import Routes
import authRoutes from './routes/authRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import workflowRoutes from './routes/workflowRoutes.js';
import taxRoutes from './routes/taxRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import ocrRoutes from './routes/ocrRoutes.js';
import pustakaRoutes from './routes/pustakaRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import legacyRoutes from './routes/legacyRoutes.js';

import { checkAuth } from './middleware/auth.js';
import { UPLOADS_DIR, upload } from './config/upload.js';
import { logger } from './utils/logger.js';
import { uploadDocument } from './controllers/documentController.js';

// Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pastikan direktori logs ada sebelum server berjalan
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 5005;

// Middleware
app.use(cors({
    origin: '*', // Allow all origins (for now) to fix local network/IP access
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Gunakan Morgan untuk log HTTP request ke konsol
const skipLogPaths = ['/uploads', '/api/ocr/status', '/api/ocr/queue', '/api/pustaka/guides', '/api/pustaka/categories', '/api/inventory', '/api/documents', '/api/logs'];
app.use(morgan('dev', {
    skip: (req, res) => skipLogPaths.some(path => req.originalUrl.includes(path))
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Database Check
// --- ROUTES ---
// import systemRoutes moved to top

// ...

app.use('/api', authRoutes); // /api/login, /api/users
app.use('/api', systemRoutes); // /api/logs, /api/roles, /api/departments, /api/folders

// --- APPROVALS ROUTES (Override Legacy) ---
app.get('/api/approvals', checkAuth, async (req, res) => {
    try {
        logger.info(`Fetching approvals for user: ${req.user?.username}`);
        const data = await knex('approvals').select('*').orderBy('created_at', 'desc');
        const parsed = data.map(a => ({
            ...a,
            steps: typeof a.steps === 'string' ? JSON.parse(a.steps || '[]') : (a.steps || [])
        }));
        res.json(parsed);
    } catch (err) {
        console.error("Error fetching approvals:", err);
        res.status(500).json({ error: `Gagal mengambil data approval: ${err.message}` });
    }
});

app.post('/api/approvals', checkAuth, async (req, res) => {
    try {
        logger.info(`User ${req.user?.username} is creating a new approval`);
        const { title, description, division, requester_name, requester_username, attachment_url, attachment_name, flow_id, steps, ocr_content } = req.body;
        const [id] = await knex('approvals').insert({
            title, description, division, requester_name, requester_username,
            attachment_url, attachment_name, ocr_content, flow_id,
            steps: JSON.stringify(steps || []),
            status: 'Pending',
            current_step_index: 0,
            created_at: new Date()
        });
        res.json({ id, message: 'Pengajuan berhasil dibuat' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Gunakan legacyRoutes hanya untuk fitur yang belum di-override.
// Pastikan rute /approvals di dalam legacyRoutes.js sudah dinonaktifkan.
app.use('/api', legacyRoutes);

app.post('/api/upload', upload.single('file'), uploadDocument); // Legacy Alias

app.use('/api/documents', documentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/tax', taxRoutes); // /api/tax/objects
app.use('/api/search', searchRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/pustaka', pustakaRoutes);

// --- SOP FLOWS (STANDARDIZATION) ROUTES ---
app.get('/api/sop-flows', checkAuth, async (req, res) => {
    try {
        const flows = await knex('sop_flows').select('*').orderBy('created_at', 'desc');
        const parsed = flows.map(f => ({
            ...f,
            steps: typeof f.steps === 'string' ? JSON.parse(f.steps || '[]') : (f.steps || []),
            visual_config: typeof f.visual_config === 'string' ? JSON.parse(f.visual_config || '{"nodes":[],"edges":[]}') : (f.visual_config || { nodes: [], edges: [] })
        }));
        res.json(parsed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sop-flows', checkAuth, async (req, res) => {
    try {
        const { title, description, category, steps, visual_config, owner } = req.body;
        const [id] = await knex('sop_flows').insert({
            title,
            description,
            category,
            steps: JSON.stringify(steps || []),
            visual_config: JSON.stringify(visual_config || {}),
            owner,
            created_at: new Date(),
            updated_at: new Date()
        });
        res.json({ id, message: 'SOP Flow created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/sop-flows/:id', checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, steps, visual_config } = req.body;
        const affected = await knex('sop_flows').where({ id }).update({
            title,
            description,
            category,
            steps: JSON.stringify(steps || []),
            visual_config: JSON.stringify(visual_config || {}),
            updated_at: new Date()
        });
        if (!affected) return res.status(404).json({ error: "SOP Flow tidak ditemukan" });
        res.json({ message: 'SOP Flow updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/sop-flows/:id', checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await knex('sop_flows').where({ id }).delete();
        res.json({ message: 'SOP Flow deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Secure File Access

app.get('/uploads/:filename', checkAuth, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(UPLOADS_DIR, filename);
    const resolvedPath = path.resolve(filePath).toLowerCase();
    const resolvedUploadsDir = path.resolve(UPLOADS_DIR).toLowerCase();

    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
        return res.status(403).json({ error: "Access Denied" });
    }
    res.sendFile(filePath, (err) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Suppress ENOENT logging or log as warning
                console.warn(`[404] File not found: ${filename}`);
                console.warn(`[404] Resolved Path: ${filePath}`);
                console.warn(`[404] Directory exists? ${fs.existsSync(UPLOADS_DIR)}`);
                if (fs.existsSync(UPLOADS_DIR)) {
                    const files = fs.readdirSync(UPLOADS_DIR);
                    console.warn(`[404] Files in dir (${files.length}):`, files.slice(0, 10)); // Show firs 10
                }
                if (!res.headersSent) res.status(404).json({ error: "File not found" });
            } else if (err.code === 'ECONNABORTED') {
                // Client aborted request - ignore
            } else {
                console.error(`Error sending file ${filename}:`, err);
                if (!res.headersSent) res.status(500).json({ error: "Error sending file" });
            }
        }
    });
});

// Endpoint untuk membaca file log Winston
app.get('/api/system/logs-file/:type', checkAuth, (req, res) => {
    const { type } = req.params;
    const logFileName = type === 'error' ? 'error.log' : 'ocr-failures.log';
    const filePath = path.join(logsDir, logFileName);

    if (!fs.existsSync(filePath)) {
        return res.json({ content: "Belum ada catatan log untuk kategori ini." });
    }

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        res.json({ content });
    } catch (err) {
        res.status(500).json({ error: "Gagal membaca file log" });
    }
});

// Socket.io
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// Global Error Handler
app.use((err, req, res, next) => {
    logger.error(`Unhandled Error: ${err.message}`, { stack: err.stack, path: req.path });
    res.status(500).json({ error: err.message });
});

// Start Server
// Ensure DB migration or init logic is handled if needed
try {
    await initDb();
    server.listen(PORT, '0.0.0.0', () => {
        logger.info(`Server started on http://0.0.0.0:${PORT}`);
        logger.info(`Uploads Directory: ${UPLOADS_DIR}`);
    });
} catch (err) {
    console.error("CRITICAL: Failed to initialize database:", err);
    process.exit(1);
}
