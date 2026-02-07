import mysql from 'mysql2';

// Create a connection pool
const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os',
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
            boxData TEXT,
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
            id INT AUTO_INCREMENT PRIMARY KEY,
            month VARCHAR(50),
            year INT,
            pph23 DECIMAL(15, 2),
            pph42 DECIMAL(15, 2),
            pph26 DECIMAL(15, 2),
            ppnIn TEXT,
            ppnOut TEXT,
            extraPph TEXT,
            extraPpnIn TEXT,
            extraPpnOut TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS external_items(
            id INT AUTO_INCREMENT PRIMARY KEY,
            boxId VARCHAR(100),
            destination VARCHAR(255),
            sentDate DATETIME,
            sender VARCHAR(100),
            boxData TEXT,
            history TEXT
        )`
    ];

    tables.forEach(sql => {
        db.run(sql, [], (err) => {
            if (err) console.error("Error init table:", err);
        });
    });

    // MIGRATION: Add columns if missing
    db.all("SHOW COLUMNS FROM logs LIKE 'oldValue'", [], (err, rows) => {
        if (!err && rows.length === 0) {
            console.log("Migrating logs table: Adding oldValue/newValue columns...");
            db.run("ALTER TABLE logs ADD COLUMN oldValue TEXT");
            db.run("ALTER TABLE logs ADD COLUMN newValue TEXT");
        }
    });

    db.all("SHOW COLUMNS FROM documents LIKE 'versionsHistory'", [], (err, rows) => {
        if (!err && rows.length === 0) {
            console.log("Migrating documents table: Adding versionsHistory column...");
            db.run("ALTER TABLE documents ADD COLUMN versionsHistory LONGTEXT");
        }
    });

    db.all("SHOW COLUMNS FROM documents LIKE 'version'", [], (err, rows) => {
        if (!err && rows.length === 0) {
            console.log("Migrating documents table: Adding version column...");
            db.run("ALTER TABLE documents ADD COLUMN version INT DEFAULT 1");
        }
    });

    db.all("SHOW COLUMNS FROM documents LIKE 'vector'", [], (err, rows) => {
        if (!err && rows.length === 0) {
            console.log("Migrating documents table: Adding vector (LONGTEXT) column...");
            db.run("ALTER TABLE documents ADD COLUMN vector LONGTEXT"); // JSON string of float array
        }
    });

    db.all("SHOW COLUMNS FROM inventory LIKE 'box_data'", [], (err, rows) => {
        if (!err && rows.length === 0) {
            console.log("Migrating inventory table: Adding box_data (LONGTEXT) column...");
            db.run("ALTER TABLE inventory ADD COLUMN box_data LONGTEXT");
        }
    });

    db.all("SHOW COLUMNS FROM documents LIKE 'status'", [], (err, rows) => {
        if (!err && rows.length === 0) {
            console.log("Migrating documents table: Adding status column...");
            db.run("ALTER TABLE documents ADD COLUMN status VARCHAR(50) DEFAULT 'ready'");
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
                db.run("INSERT INTO inventory (id, status, lastUpdated, boxData, history) VALUES (?, ?, ?, ?, ?)", [i, 'EMPTY', null, null, JSON.stringify([])]);
            }
        }
    });
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
