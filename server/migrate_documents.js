import mysql from 'mysql2/promise';

const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os'
};

async function migrate() {
    const connection = await mysql.createConnection(dbConfig);
    console.log('Migrating documents table...');

    try {
        // Change folderId from INT to VARCHAR(255)
        await connection.execute("ALTER TABLE documents MODIFY COLUMN folderId VARCHAR(255)");
        console.log('- Modified folderId to VARCHAR(255)');

        // Add auditId if not exists
        try {
            await connection.execute("ALTER TABLE documents ADD COLUMN auditId VARCHAR(255)");
            console.log('- Added column auditId');
        } catch (e) { console.log('- Column auditId might already exist'); }

        // Add stepIndex if not exists
        try {
            await connection.execute("ALTER TABLE documents ADD COLUMN stepIndex INT");
            console.log('- Added column stepIndex');
        } catch (e) { console.log('- Column stepIndex might already exist'); }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
