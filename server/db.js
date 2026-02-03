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
    multipleStatements: true // Allow multiple statements for init if needed
});

console.log('Connecting to MySQL database...');

// Wrapper to mimic SQLite API for existing index.js compatibility
const db = {
    run: (sql, params, callback) => {
        pool.query(sql, params, function (err, results) {
            if (callback) {
                // Mimic SQLite 'this' context for lastID and changes
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
            owner VARCHAR(100)
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
            stepIndex INT
        )`,
        `CREATE TABLE IF NOT EXISTS logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_name VARCHAR(100),
            action VARCHAR(100),
            details TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS tax_audits (
            id VARCHAR(255) PRIMARY KEY,
            title VARCHAR(255),
            status VARCHAR(50),
            currentStep INT,
            steps TEXT,
            letterNumber VARCHAR(100),
            startDate DATETIME
        )`,
        `CREATE TABLE IF NOT EXISTS tax_summaries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            month VARCHAR(50),
            year INT,
            pph23 DECIMAL(15,2),
            pph42 DECIMAL(15,2),
            pph26 DECIMAL(15,2),
            ppnIn TEXT,
            ppnOut TEXT,
            extraPph TEXT,
            extraPpnIn TEXT,
            extraPpnOut TEXT
        )`
    ];

    tables.forEach(sql => {
        pool.query(sql, (err) => {
            if (err) console.error("Error creating table:", err.message);
        });
    });

    // Seed Data Check
    pool.query("SELECT count(*) as count FROM users", (err, rows) => {
        if (!err && rows[0].count === 0) {
            console.log("Seeding initial data...");
            pool.query("INSERT INTO users (username, password, name, role, department) VALUES ('admin', '123', 'Administrator', 'admin', 'IT')");
            pool.query("INSERT INTO users (username, password, name, role, department) VALUES ('staff', '123', 'Staff Gudang', 'staff', 'Warehouse')");
            pool.query("INSERT INTO users (username, password, name, role, department) VALUES ('viewer', '123', 'Tamu', 'viewer', 'General')");
        }
    });

    pool.query("SELECT count(*) as count FROM departments", (err, rows) => {
        if (!err && rows[0].count === 0) {
            ['IT', 'Finance', 'HR', 'Warehouse', 'General'].forEach(dept => {
                pool.query("INSERT INTO departments (name) VALUES (?)", [dept]);
            });
        }
    });

    pool.query("SELECT count(*) as count FROM roles", (err, rows) => {
        if (!err && rows[0].count === 0) {
            pool.query("INSERT INTO roles (id, label, access) VALUES (?, ?, ?)", ['admin', 'Administrator', JSON.stringify(['all'])]);
            pool.query("INSERT INTO roles (id, label, access) VALUES (?, ?, ?)", ['staff', 'Staff Gudang', JSON.stringify(['dashboard', 'inventory', 'inventory_edit', 'documents', 'documents_upload', 'documents_edit', 'tax', 'tax_manage', 'summary-tax'])]);
            pool.query("INSERT INTO roles (id, label, access) VALUES (?, ?, ?)", ['viewer', 'Tamu / Viewer', JSON.stringify(['dashboard', 'inventory', 'documents', 'tax', 'summary-tax'])]);
        }
    });

    pool.query("SELECT count(*) as count FROM inventory", (err, rows) => {
        if (!err && rows[0].count === 0) {
            for (let i = 1; i <= 100; i++) {
                pool.query("INSERT INTO inventory (id, status, lastUpdated, boxData, history) VALUES (?, ?, ?, ?, ?)", [i, 'EMPTY', null, null, JSON.stringify([])]);
            }
            // Seed first slot logic can be added here if really needed, but keeping it simple for now
        }
    });
}

// Initial connection test and setup
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

