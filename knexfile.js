import dotenv from 'dotenv';
dotenv.config();

export default {
    development: {
        client: 'mysql2',
        connection: {
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'archive_os',
        },
        migrations: {
            directory: './server/migrations',
            tableName: 'knex_migrations'
        },
        seeds: {
            directory: './server/seeds'
        }
    }
};
