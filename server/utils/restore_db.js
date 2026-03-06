import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function restore() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'archive_os',
        multipleStatements: true
    });

    try {
        const sqlPath = path.join(__dirname, '..', 'archive_os (1).sql');
        console.log(`Membaca file SQL dari: ${sqlPath}`);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Sedang memulihkan database...");
        await connection.query(sql);
        console.log("✅ Database berhasil dipulihkan dari file SQL.");
    } catch (err) {
        console.error("❌ Gagal memulihkan database:", err);
    } finally {
        await connection.end();
    }
}

restore();