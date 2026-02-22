import express from 'express';
import cors from 'cors';
import fs from 'fs';
import bodyParser from 'body-parser';
import { knex } from './db.js';
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
import { uploadDocument } from './controllers/documentController.js';

// Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = 5000;

// Middleware
app.use(cors({
    origin: '*', // Allow all origins (for now) to fix local network/IP access
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Database Check
knex.raw("SELECT 1").then(() => {
    console.log("Database connected.");
}).catch(e => console.error("DB Connection Failed:", e));

// --- ROUTES ---
// import systemRoutes moved to top

// ...

app.use('/api', authRoutes); // /api/login, /api/users
app.use('/api', systemRoutes); // /api/logs, /api/roles, /api/departments, /api/folders
app.use('/api', legacyRoutes); // /api/tax-audits, /api/approvals etc.

app.post('/api/upload', upload.single('file'), uploadDocument); // Legacy Alias

app.use('/api/documents', documentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/tax', taxRoutes); // /api/tax/objects
app.use('/api/search', searchRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/pustaka', pustakaRoutes);

// Secure File Access

// Secure File Access
app.get('/uploads/:filename', (req, res) => {
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

// Socket.io
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Global Error:", err);
    res.status(500).json({ error: err.message });
});

// Start Server
// Ensure DB migration or init logic is handled if needed
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
    console.log(`Uploads Directory: ${UPLOADS_DIR}`);
});
