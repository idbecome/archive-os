import mysql from 'mysql2';

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os'
});

pool.query(
    `SELECT id, title, type, 
     LEFT(url, 80) AS url_preview, 
     LEFT(fileData, 80) AS filedata_preview, 
     LENGTH(fileData) AS filedata_len 
     FROM documents WHERE type LIKE '%pdf%' LIMIT 10`,
    (err, rows) => {
        if (err) { console.error('ERROR:', err.message); process.exit(1); }
        rows.forEach(r => {
            console.log('---');
            console.log('id:', r.id);
            console.log('title:', r.title);
            console.log('url:', r.url_preview);
            console.log('fileData:', r.filedata_preview);
            console.log('fileData length:', r.filedata_len);
        });
        pool.end();
    }
);
