import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

// Create a connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'archive_os',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
});

console.log('Connecting to MySQL database...');

// Wrapper to mimic SQLite API
const db = {
    run: (sql, params, callback) => {
        pool.query(sql, params, function (err, results) {
            if (callback) {
                const context = {
                    lastID: results ? results.insertId : 0,
                    changes: results ? results.affectedRows : 0
                };
                callback.call(context, err);
            }
        });
    },
    all: (sql, params, callback) => {
        pool.query(sql, params, (err, rows) => {
            if (callback) callback(err, rows);
        });
    },
    get: (sql, params, callback) => {
        pool.query(sql, params, (err, rows) => {
            if (callback) callback(err, rows ? rows[0] : null);
        });
    },
    close: () => {
        pool.end();
    },
    // Helper methods for Worker (Promise-based)
    getDocumentById: (id) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM documents WHERE id = ?", [id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows ? rows[0] : null);
            });
        });
    },
    updateDocument: (id, data) => {
        return new Promise((resolve, reject) => {
            // Filter out fields that are not columns or should not be updated
            // For simplicity, we'll update fields that match known columns roughly
            // or just use the keys from data.
            // ID should not be updated.
            const keys = Object.keys(data).filter(k => k !== 'id');
            if (keys.length === 0) return resolve();

            const setClause = keys.map(k => `${k} = ?`).join(', ');
            const values = keys.map(k => {
                const val = data[k];
                if (typeof val === 'object' && val !== null) return JSON.stringify(val);
                return val;
            });
            values.push(id);

            const sql = `UPDATE documents SET ${setClause} WHERE id = ?`;
            pool.query(sql, values, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }
};

function initDb() {
    const tables = [
        `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE,
            password VARCHAR(255),
            name VARCHAR(255),
            role VARCHAR(50),
            department VARCHAR(100)
        )`,
        `CREATE TABLE IF NOT EXISTS departments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) UNIQUE
        )`,
        `CREATE TABLE IF NOT EXISTS roles (
            id VARCHAR(50) PRIMARY KEY,
            label VARCHAR(255),
            access TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS inventory (
            id INT PRIMARY KEY,
            status VARCHAR(50),
            lastUpdated DATETIME,
            box_data LONGTEXT,
            history TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS folders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            parentId INT,
            name VARCHAR(255),
            privacy VARCHAR(50),
            allowedDepts TEXT,
            allowedUsers TEXT,
            owner VARCHAR(100),
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS documents (
            id VARCHAR(255) PRIMARY KEY,
            title VARCHAR(255),
            type VARCHAR(50),
            size VARCHAR(50),
            uploadDate DATETIME,
            url TEXT,
            folderId VARCHAR(255),
            department VARCHAR(100),
            owner VARCHAR(100),
            ocrContent LONGTEXT,
            auditId VARCHAR(255),
            stepIndex INT,
            fileData LONGTEXT,
            versionsHistory LONGTEXT,
            version INT DEFAULT 1
        )`,
        `CREATE TABLE IF NOT EXISTS logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            user VARCHAR(100),
            action VARCHAR(100),
            details TEXT,
            oldValue TEXT,
            newValue TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS tax_audits(
            id VARCHAR(255) PRIMARY KEY,
            title VARCHAR(255),
            status VARCHAR(50),
            currentStep INT,
            steps TEXT,
            letterNumber VARCHAR(100),
            startDate DATETIME
        )`,
        `CREATE TABLE IF NOT EXISTS tax_summaries(
            id VARCHAR(255) PRIMARY KEY,
            type VARCHAR(20),
            month VARCHAR(50),
            year INT,
            pembetulan INT DEFAULT 0,
            data LONGTEXT
        )`,
        `CREATE TABLE IF NOT EXISTS external_items(
            id INT AUTO_INCREMENT PRIMARY KEY,
            boxId VARCHAR(100),
            destination VARCHAR(255),
            sentDate DATETIME,
            sender VARCHAR(100),
            boxData TEXT,
            history TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS inventory_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            inventory_id INT,
            box_id VARCHAR(100),
            ordner_id VARCHAR(100),
            invoice_no VARCHAR(255),
            vendor VARCHAR(255),
            date DATETIME,
            amount DECIMAL(15, 2),
            file_url TEXT,
            ocr_content LONGTEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_search (invoice_no, vendor),
            FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS boxes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            inventory_id INT,
            box_id VARCHAR(100),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_box_id (box_id),
            INDEX idx_inventory_id (inventory_id)
        )`,
        `CREATE TABLE IF NOT EXISTS ordners (
            id INT AUTO_INCREMENT PRIMARY KEY,
            box_ref_id INT,
            no_ordner VARCHAR(100),
            period VARCHAR(100),
            FOREIGN KEY (box_ref_id) REFERENCES boxes(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS invoices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ordner_ref_id INT,
            invoice_no VARCHAR(255),
            vendor VARCHAR(255),
            payment_date VARCHAR(100),
            file_url TEXT,
            file_name VARCHAR(255),
            ocr_content LONGTEXT,
            INDEX idx_invoice_no (invoice_no),
            INDEX idx_vendor (vendor),
            FOREIGN KEY (ordner_ref_id) REFERENCES ordners(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS tax_objects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            id_type VARCHAR(50),
            identity_number VARCHAR(100),
            name VARCHAR(255),
            email VARCHAR(255),
            tax_type VARCHAR(50),
            tax_object_code VARCHAR(100),
            tax_object_name VARCHAR(255),
            dpp DECIMAL(15, 2),
            rate DECIMAL(5, 2),
            pph DECIMAL(15, 2),
            ppn DECIMAL(15, 2),
            total_payable DECIMAL(15, 2),
            discount DECIMAL(15, 2),
            dpp_net DECIMAL(15, 2),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS master_tax_objects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tax_type VARCHAR(50),
            code VARCHAR(100),
            name VARCHAR(255),
            note TEXT,
            rate DECIMAL(5, 2),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS job_queue (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            data LONGTEXT,
            status VARCHAR(50) DEFAULT 'waiting',
            progress INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            processed_at DATETIME,
            finished_at DATETIME,
            error TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS document_approvals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title TEXT,
            description TEXT,
            division TEXT,
            requester_name TEXT,
            requester_username TEXT,
            attachment_url TEXT,
            attachment_name TEXT,
            status VARCHAR(50) DEFAULT 'Pending',
            current_step_index INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            ocr_content LONGTEXT
        )`,
        `CREATE TABLE IF NOT EXISTS approval_steps (
            id INT AUTO_INCREMENT PRIMARY KEY,
            approval_id INT,
            step_index INT,
            approver_username TEXT,
            approver_name TEXT,
            status VARCHAR(50) DEFAULT 'Pending',
            action_date DATETIME,
            note TEXT,
            attachment_url TEXT,
            attachment_name TEXT,
            FOREIGN KEY (approval_id) REFERENCES document_approvals(id) ON DELETE CASCADE
        )`
        ,
        `CREATE TABLE IF NOT EXISTS approval_flows (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            description TEXT,
            steps LONGTEXT
        )`,
        `CREATE TABLE IF NOT EXISTS pustaka_guides (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255),
            description TEXT,
            category VARCHAR(100),
            icon VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            privacy VARCHAR(50) DEFAULT 'public',
            allowed_depts TEXT,
            allowed_users TEXT,
            owner VARCHAR(100)
        )`,
        `CREATE TABLE IF NOT EXISTS pustaka_slides (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guide_id INT,
            title VARCHAR(255),
            content TEXT,
            image TEXT,
            step_order INT,
            FOREIGN KEY (guide_id) REFERENCES pustaka_guides(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS pustaka_categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) UNIQUE
        )`,
        `CREATE TABLE IF NOT EXISTS comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            documentId VARCHAR(255),
            user VARCHAR(100),
            text TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            attachmentUrl TEXT,
            attachmentName TEXT,
            attachmentType VARCHAR(100),
            attachmentSize VARCHAR(50)
        )`,
        `CREATE TABLE IF NOT EXISTS tax_audit_notes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            auditId VARCHAR(255),
            stepIndex INT,
            user VARCHAR(100),
            text TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            attachmentUrl TEXT,
            attachmentName TEXT,
            attachmentType VARCHAR(100),
            attachmentSize VARCHAR(50)
        )`
    ];

    // Execute table creation sequentially to avoid foreign key errors (errno 150)
    (async () => {
        for (const sql of tables) {
            await new Promise((resolve) => {
                db.run(sql, [], (err) => {
                    if (err) console.error("Error init table:", err.message);
                    resolve();
                });
            });
        }

        // MIGRATION: Add columns if missing
        db.all("SHOW COLUMNS FROM logs LIKE 'oldValue'", [], (err, rows) => {
            if (!err && rows.length === 0) {
                console.log("Migrating logs table: Adding oldValue/newValue columns...");
                db.run("ALTER TABLE logs ADD COLUMN oldValue TEXT");
                db.run("ALTER TABLE logs ADD COLUMN newValue TEXT");
            }
        });

        db.all("SHOW COLUMNS FROM pustaka_guides LIKE 'privacy'", [], (err, rows) => {
            if (!err && rows.length === 0) {
                console.log("Migrating pustaka_guides table: Adding privacy columns...");
                db.run("ALTER TABLE pustaka_guides ADD COLUMN privacy VARCHAR(50) DEFAULT 'public'");
                db.run("ALTER TABLE pustaka_guides ADD COLUMN allowed_depts TEXT");
                db.run("ALTER TABLE pustaka_guides ADD COLUMN allowed_users TEXT");
                db.run("ALTER TABLE pustaka_guides ADD COLUMN owner VARCHAR(100)");
            }
        });

        db.all("SHOW COLUMNS FROM approval_steps LIKE 'attachment_url'", [], (err, rows) => {
            if (!err && rows.length === 0) {
                console.log("Migrating approval_steps table: Adding attachment columns...");
                db.run("ALTER TABLE approval_steps ADD COLUMN attachment_url TEXT");
                db.run("ALTER TABLE approval_steps ADD COLUMN attachment_name TEXT");
            }
        });

        // MIGRATION: Pastikan tax_summaries menggunakan skema baru (kolom 'data')
        db.all("SHOW COLUMNS FROM tax_summaries LIKE 'data'", [], (err, rows) => {
            if (!err && rows.length === 0) {
                console.log("Migrating tax_summaries table: Old schema detected. Recreating for dynamic structure...");
                db.run("DROP TABLE tax_summaries", [], () => {
                    db.run(`CREATE TABLE tax_summaries(
                    id VARCHAR(255) PRIMARY KEY,
                    type VARCHAR(20),
                    month VARCHAR(50),
                    year INT,
                    pembetulan INT DEFAULT 0,
                    data LONGTEXT
                )`);
                });
            }
        });

        db.all("SHOW COLUMNS FROM documents LIKE 'version'", [], (err, rows) => {
            if (!err && rows.length === 0) {
                console.log("Migrating documents table: Adding version column...");
                db.run("ALTER TABLE documents ADD COLUMN version INT DEFAULT 1");
                // Ensure existing documents have version 1
                setTimeout(() => {
                    db.run("UPDATE documents SET version = 1 WHERE version IS NULL");
                }, 1000);
            } else {
                // Even if column exists, check for NULLs
                db.run("UPDATE documents SET version = 1 WHERE version IS NULL");
            }
        });

        db.all("SHOW COLUMNS FROM documents LIKE 'versionsHistory'", [], (err, rows) => {
            if (!err && rows.length === 0) {
                console.log("Migrating documents table: Adding versionsHistory column...");
                db.run("ALTER TABLE documents ADD COLUMN versionsHistory LONGTEXT");
                setTimeout(() => {
                    db.run("UPDATE documents SET versionsHistory = '[]' WHERE versionsHistory IS NULL");
                }, 1000);
            } else {
                db.run("UPDATE documents SET versionsHistory = '[]' WHERE versionsHistory IS NULL");
            }
        });

        db.all("SHOW COLUMNS FROM documents LIKE 'vector'", [], (err, rows) => {
            if (!err && rows.length === 0) {
                console.log("Migrating documents table: Adding vector (LONGTEXT) column...");
                db.run("ALTER TABLE documents ADD COLUMN vector LONGTEXT"); // JSON string of float array
            }
        });

        // MIGRATION: Consolidate boxData → box_data and drop legacy column
        db.all("SHOW COLUMNS FROM inventory LIKE 'box_data'", [], (err, rows) => {
            if (!err && rows.length === 0) {
                console.log("Migrating inventory table: Adding box_data (LONGTEXT) column...");
                db.run("ALTER TABLE inventory ADD COLUMN box_data LONGTEXT", [], () => {
                    // Copy data from boxData to box_data
                    db.run("UPDATE inventory SET box_data = boxData WHERE box_data IS NULL AND boxData IS NOT NULL", [], () => {
                        console.log("Copied boxData → box_data for existing rows.");
                    });
                });
            } else if (!err && rows.length > 0) {
                // Column exists — consolidate any remaining boxData data
                db.all("SHOW COLUMNS FROM inventory LIKE 'boxData'", [], (err2, rows2) => {
                    if (!err2 && rows2.length > 0) {
                        // Legacy column still exists, consolidate and drop
                        db.run("UPDATE inventory SET box_data = boxData WHERE (box_data IS NULL OR box_data = '') AND boxData IS NOT NULL AND boxData != ''", [], (updErr) => {
                            if (!updErr) {
                                console.log("Consolidated boxData → box_data. Dropping legacy boxData column...");
                                db.run("ALTER TABLE inventory DROP COLUMN boxData", [], (dropErr) => {
                                    if (dropErr) {
                                        console.error("Could not drop boxData column (may already be dropped):", dropErr.message);
                                    } else {
                                        console.log("Legacy boxData column dropped successfully.");
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });

        // MIGRATION: Populate relational tables (boxes, ordners, invoices) from JSON
        db.all("SELECT count(*) as count FROM boxes", [], (err, rows) => {
            if (err) return; // Table might not exist yet on first run
            if (rows[0].count === 0) {
                console.log("Populating relational tables from inventory JSON data...");
                db.all("SELECT id, box_data FROM inventory WHERE status != 'EMPTY'", [], (invErr, invRows) => {
                    if (invErr || !invRows) return;

                    let boxCount = 0, ordnerCount = 0, invoiceCount = 0;

                    invRows.forEach(row => {
                        const rawJson = row.box_data;
                        if (!rawJson) return;

                        let data;
                        try { data = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson; } catch (e) { return; }
                        if (!data || !data.id) return; // data.id = box_id (e.g. "BOX-2024-001")

                        // Insert into boxes
                        db.run("INSERT INTO boxes (inventory_id, box_id) VALUES (?, ?)",
                            [row.id, data.id], function (bErr) {
                                if (bErr) { console.error("Box insert err:", bErr.message); return; }
                                const boxRefId = this.lastID;
                                boxCount++;

                                if (!data.ordners || !Array.isArray(data.ordners)) return;

                                data.ordners.forEach(ord => {
                                    db.run("INSERT INTO ordners (box_ref_id, no_ordner, period) VALUES (?, ?, ?)",
                                        [boxRefId, ord.noOrdner || '', ord.period || ''], function (oErr) {
                                            if (oErr) { console.error("Ordner insert err:", oErr.message); return; }
                                            const ordnerRefId = this.lastID;
                                            ordnerCount++;

                                            if (!ord.invoices || !Array.isArray(ord.invoices)) return;

                                            ord.invoices.forEach(inv => {
                                                db.run(`INSERT INTO invoices (ordner_ref_id, invoice_no, vendor, payment_date, file_url, file_name, ocr_content) 
                                                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                                    [ordnerRefId, inv.invoiceNo || '', inv.vendor || '', inv.paymentDate || null,
                                                        inv.file || '', inv.fileName || '', inv.ocrContent || ''],
                                                    (iErr) => {
                                                        if (iErr) console.error("Invoice insert err:", iErr.message);
                                                        else invoiceCount++;
                                                    }
                                                );
                                            });
                                        }
                                    );
                                });
                            }
                        );
                    });

                    setTimeout(() => {
                        console.log(`Relational migration complete: ${boxCount} boxes, ${ordnerCount} ordners, ${invoiceCount} invoices.`);
                    }, 3000);
                });
            }
        });

        db.all("SHOW COLUMNS FROM documents LIKE 'status'", [], (err, rows) => {
            if (!err && rows.length === 0) {
                console.log("Migrating documents table: Adding status column...");
                db.run("ALTER TABLE documents ADD COLUMN status VARCHAR(50) DEFAULT 'ready'");
            }
        });

        // Rate migrations
        db.all("SHOW COLUMNS FROM master_tax_objects LIKE 'rate'", [], (err, rows) => {
            if (!err && rows.length === 0) {
                console.log("Migrating master_tax_objects table: Adding rate column...");
                db.run("ALTER TABLE master_tax_objects ADD COLUMN rate DECIMAL(5, 2)");
            }
        });

        // MIGRATION: Tambahkan kolom yang hilang pada tax_objects (email, ppn, dll)
        const taxObjectColumns = [
            { name: 'email', type: 'VARCHAR(255) AFTER name' },
            { name: 'ppn', type: 'DECIMAL(15, 2) AFTER pph' },
            { name: 'total_payable', type: 'DECIMAL(15, 2) AFTER ppn' },
            { name: 'discount', type: 'DECIMAL(15, 2) AFTER total_payable' },
            { name: 'dpp_net', type: 'DECIMAL(15, 2) AFTER discount' }
        ];

        taxObjectColumns.forEach(col => {
            db.all(`SHOW COLUMNS FROM tax_objects LIKE '${col.name}'`, [], (err, rows) => {
                if (!err && rows.length === 0) {
                    console.log(`Migrating tax_objects table: Adding ${col.name} column...`);
                    db.run(`ALTER TABLE tax_objects ADD COLUMN ${col.name} ${col.type}`);
                }
            });
        });

        db.all("SHOW COLUMNS FROM tax_objects LIKE 'rate'", [], (err, rows) => {
            if (!err && rows.length === 0) {
                console.log("Migrating tax_objects table: Adding rate column...");
                db.run("ALTER TABLE tax_objects ADD COLUMN rate DECIMAL(5, 2)");
            }
        });


        // Seed Data
        db.all("SELECT count(*) as count FROM users", [], (err, rows) => {
            if (!err && rows[0].count === 0) {
                console.log("Seeding initial data...");
                db.run("INSERT INTO users (username, password, name, role, department) VALUES ('admin', '123', 'Administrator', 'admin', 'IT')");
                db.run("INSERT INTO users (username, password, name, role, department) VALUES ('staff', '123', 'Staff Gudang', 'staff', 'Warehouse')");
                db.run("INSERT INTO users (username, password, name, role, department) VALUES ('viewer', '123', 'Tamu', 'viewer', 'General')");
            }
        });

        db.all("SELECT count(*) as count FROM departments", [], (err, rows) => {
            if (!err && rows[0].count === 0) {
                ['IT', 'Finance', 'HR', 'Warehouse', 'General'].forEach(dept => {
                    db.run("INSERT INTO departments (name) VALUES (?)", [dept]);
                });
            }
        });

        db.all("SELECT count(*) as count FROM roles", [], (err, rows) => {
            if (!err && rows[0].count === 0) {
                db.run("INSERT INTO roles (id, label, access) VALUES (?, ?, ?)", ['admin', 'Administrator', JSON.stringify({
                    dashboard: ['view'],
                    inventory: ['view', 'create', 'edit', 'delete'],
                    documents: ['view', 'create', 'edit', 'delete'],
                    'tax-monitoring': ['view', 'create', 'edit', 'delete'],
                    'tax-summary': ['view', 'create', 'edit', 'delete'],
                    master: ['view', 'create', 'edit', 'delete']
                })]);
                db.run("INSERT INTO roles (id, label, access) VALUES (?, ?, ?)", ['staff', 'Staff Gudang', JSON.stringify({
                    dashboard: ['view'],
                    inventory: ['view', 'create', 'edit'],
                    documents: ['view', 'create'],
                    'tax-monitoring': ['view'],
                    'tax-summary': ['view']
                })]);
                db.run("INSERT INTO roles (id, label, access) VALUES (?, ?, ?)", ['viewer', 'Tamu / Viewer', JSON.stringify({
                    dashboard: ['view'],
                    inventory: ['view'],
                    documents: ['view'],
                    'tax-monitoring': ['view'],
                    'tax-summary': ['view']
                })]);
            }
        });

        db.all("SELECT count(*) as count FROM inventory", [], (err, rows) => {
            if (!err && rows[0].count === 0) {
                for (let i = 1; i <= 100; i++) {
                    db.run("INSERT INTO inventory (id, status, lastUpdated, box_data, history) VALUES (?, ?, ?, ?, ?)", [i, 'EMPTY', null, null, JSON.stringify([])]);
                }
            }
        });
    })();
}

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err.code, err.message);
        console.error('Make sure XAMPP/MySQL is running and database "archive_os" exists.');
    } else {
        console.log('Connected to MySQL database successfully.');
        initDb();
        connection.release();
    }
});

export default db;
