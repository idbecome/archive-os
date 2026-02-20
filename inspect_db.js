import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

console.log('Reading DB credentials from .env...');
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'archive_os',
    connectTimeout: 10000 // 10 second timeout
};
console.log('DB Config:', { ...dbConfig, password: '***' });


const args = process.argv.slice(2);
const tableName = args[0];
const recordId = args[1];

if (!tableName) {
    console.error('Please provide a table name.');
    process.exit(1);
}

console.log('Attempting to connect to MySQL...');
const connection = mysql.createConnection(dbConfig);

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        connection.end();
        return;
    }
    console.log('Connected to MySQL successfully.');

    let query;
    const queryParams = [];

    if (recordId) {
        query = `SELECT * FROM ?? WHERE id = ?`;
        queryParams.push(tableName, recordId);
    } else {
        query = `SELECT * FROM ?? LIMIT 10`;
        queryParams.push(tableName);
    }
    
    console.log(`Executing query: ${query.replace('??', `\`${tableName}\``).replace('?', `'${recordId || ''}'`)}`);

    connection.query(query, queryParams, (err, rows) => {
        if (err) {
            console.error('Query Error:', err);
        } else {
            console.log("Query Result:", JSON.stringify(rows, null, 2));
        }
        console.log('Closing connection.');
        connection.end();
    });
});
