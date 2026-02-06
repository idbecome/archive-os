import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os'
});

async function configure() {
    try {
        console.log("Connecting to Database...");
        const conn = await pool.getConnection();

        console.log("Setting GLOBAL max_allowed_packet to 64MB...");
        await conn.query("SET GLOBAL max_allowed_packet = 67108864");

        console.log("Verifying...");
        const [rows] = await conn.query("SHOW VARIABLES LIKE 'max_allowed_packet'");
        console.log("Current max_allowed_packet:", rows[0].Value);

        conn.release();
        process.exit(0);
    } catch (e) {
        console.error("Error configuration:", e);
        process.exit(1);
    }
}

configure();
