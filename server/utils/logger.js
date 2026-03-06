import winston from 'winston';
import path from 'path';
import { knex } from '../db.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGS_PATH = path.join(__dirname, '..', 'logs');

const { combine, timestamp, printf, colorize, json } = winston.format;

// Format kustom untuk tampilan konsol
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}] : ${message}`;
    if (Object.keys(metadata).length > 0 && metadata.docId) {
        msg += ` (DocID: ${metadata.docId}, File: ${metadata.filename})`;
    }
    return msg;
});

export const logger = winston.createLogger({
    level: 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        json()
    ),
    transports: [
        // 1. Simpan semua error ke file khusus
        new winston.transports.File({
            filename: path.join(LOGS_PATH, 'error.log'),
            level: 'error'
        }),
        // 2. Simpan log spesifik kegagalan OCR agar admin mudah melacak
        new winston.transports.File({
            filename: path.join(LOGS_PATH, 'ocr-failures.log'),
            level: 'warn',
            handleExceptions: true
        }),
        // 5. Simpan semua log (info, warn, error) ke server.log
        new winston.transports.File({
            filename: path.join(LOGS_PATH, 'server.log'),
            level: 'info'
        }),
        // 3. Tampilkan di konsol dengan warna untuk development
        new winston.transports.Console({
            format: combine(
                colorize(),
                timestamp({ format: 'HH:mm:ss' }),
                consoleFormat
            )
        }),
        // 4. External Logging (HTTP/Datadog/Logstash)
        ...(process.env.LOG_HTTP_URL ? [
            new winston.transports.Http({
                host: process.env.LOG_HTTP_HOST || 'http-intake.logs.datadoghq.com',
                path: process.env.LOG_HTTP_PATH || `/api/v2/logs?dd-api-key=${process.env.DATADOG_API_KEY}&ddsource=nodejs&service=${process.env.APP_NAME || 'archive-os'}`,
                ssl: true,
                batch: true,
                batchInterval: 5000
            })
        ] : [])
    ]
});

// Fungsi Helper untuk mencatat Audit Trail ke Database & Winston secara bersamaan
export const systemLog = async (user, action, details, oldValue = null, newValue = null) => {
    // 1. Log ke Winston (File & Konsol)
    const logMsg = `${action}: ${details}`;
    if (action.toLowerCase().includes('fail') || action.toLowerCase().includes('error')) {
        logger.error(logMsg, { user, details });
    } else {
        logger.info(logMsg, { user, details });
    }

    // 2. Log ke Database (Agar muncul di Tab Log UI)
    const logData = {
        user: user || 'System',
        action: action,
        details: details,
        oldValue: oldValue || null, // Knex handles object to JSONB
        newValue: newValue || null,
        timestamp: new Date()
    };
    try {
        console.log("Attempting to write to system log with data:", logData);
        await knex('logs').insert(logData);
    } catch (err) {
        logger.error('Gagal menulis audit log ke database', { error: err.message });
        console.error("System log data that failed:", logData);
    }
};

export default logger;