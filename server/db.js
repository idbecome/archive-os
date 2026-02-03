import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'archive_db.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      name TEXT,
      role TEXT,
      department TEXT
    )`);

        // Departments Table
        db.run(`CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE
    )`);

        // Roles Table
        db.run(`CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      label TEXT,
      access TEXT
    )`);

        // Inventory Table
        db.run(`CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY,
      status TEXT,
      lastUpdated TEXT,
      boxData TEXT,
      history TEXT
    )`);

        // Folders Table
        db.run(`CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parentId INTEGER,
      name TEXT,
      privacy TEXT,
      allowedDepts TEXT,
      allowedUsers TEXT,
      owner TEXT
    )`);

        // Documents Table
        db.run(`CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT,
      type TEXT,
      size TEXT,
      uploadDate TEXT,
      url TEXT,
      folderId INTEGER,
      department TEXT,
      owner TEXT,
      ocrContent TEXT
    )`);

        // Logs Table
        db.run(`CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT,
      user_name TEXT,
      action TEXT,
      details TEXT
    )`);

        // Tax Audits Table
        db.run(`CREATE TABLE IF NOT EXISTS tax_audits (
      id TEXT PRIMARY KEY,
      title TEXT,
      status TEXT,
      currentStep INTEGER,
      steps TEXT
    )`);

        // Tax Summaries Table
        db.run(`CREATE TABLE IF NOT EXISTS tax_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT,
      year INTEGER,
      pph23 REAL,
      pph42 REAL,
      pph26 REAL,
      ppnIn TEXT,
      ppnOut TEXT,
      extraPph TEXT,
      extraPpnIn TEXT,
      extraPpnOut TEXT
    )`);

        // Seed Initial Data if empty
        db.get("SELECT count(*) as count FROM users", (err, row) => {
            if (row.count === 0) {
                db.run("INSERT INTO users (username, password, name, role, department) VALUES ('admin', '123', 'Administrator', 'admin', 'IT')");
                db.run("INSERT INTO users (username, password, name, role, department) VALUES ('staff', '123', 'Staff Gudang', 'staff', 'Warehouse')");
                db.run("INSERT INTO users (username, password, name, role, department) VALUES ('viewer', '123', 'Tamu', 'viewer', 'General')");
            }
        });

        db.get("SELECT count(*) as count FROM departments", (err, row) => {
            if (row.count === 0) {
                ['IT', 'Finance', 'HR', 'Warehouse', 'General'].forEach(dept => {
                    db.run("INSERT INTO departments (name) VALUES (?)", [dept]);
                });
            }
        });

        db.get("SELECT count(*) as count FROM roles", (err, row) => {
            if (row.count === 0) {
                db.run("INSERT INTO roles (id, label, access) VALUES (?, ?, ?)", ['admin', 'Administrator', JSON.stringify(['all'])]);
                db.run("INSERT INTO roles (id, label, access) VALUES (?, ?, ?)", ['staff', 'Staff Gudang', JSON.stringify(['dashboard', 'inventory', 'inventory_edit', 'documents', 'documents_upload', 'documents_edit', 'tax', 'tax_manage', 'summary-tax'])]);
                db.run("INSERT INTO roles (id, label, access) VALUES (?, ?, ?)", ['viewer', 'Tamu / Viewer', JSON.stringify(['dashboard', 'inventory', 'documents', 'tax', 'summary-tax'])]);
            }
        });

        db.get("SELECT count(*) as count FROM inventory", (err, row) => {
            if (row.count === 0) {
                for (let i = 1; i <= 100; i++) {
                    db.run("INSERT INTO inventory (id, status, lastUpdated, boxData, history) VALUES (?, ?, ?, ?, ?)", [i, 'EMPTY', null, null, JSON.stringify([])]);
                }
                // Seed first slot
                const firstHistory = JSON.stringify([{ id: 1, timestamp: new Date().toISOString(), action: 'STORED', note: 'Initial Stock: BOX-2023-001 masuk.', user: 'System' }]);
                const firstBoxData = JSON.stringify({
                    id: 'BOX-2023-001',
                    ordners: [
                        { id: 101, noOrdner: 'ORD-FIN-01', period: 'Jan 2023', invoices: [{ id: 1, invoiceNo: 'INV/001', vendor: 'Vendor A' }] }
                    ]
                });
                db.run("UPDATE inventory SET status = ?, lastUpdated = ?, boxData = ?, history = ? WHERE id = 1", ['STORED', new Date().toISOString(), firstBoxData, firstHistory]);
            }
        });
    });
}

export default db;
