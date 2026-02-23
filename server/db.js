import knexConfig from '../knexfile.js';
import knexLib from 'knex';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
dotenv.config();

const knex = knexLib(knexConfig.development);

// Wrapper to mimic SQLite API (compat layer) - DEPRECATED: Use knex directly
const db = {
    // Helper methods for Worker (Promise-based)
    getDocumentById: async (id) => {
        return await knex('documents').where('id', id).first();
    },
    updateDocument: async (id, data) => {
        const filteredData = { ...data };
        delete filteredData.id;

        // Handle object fields
        Object.keys(filteredData).forEach(key => {
            if (typeof filteredData[key] === 'object' && filteredData[key] !== null) {
                filteredData[key] = JSON.stringify(filteredData[key]);
            }
        });

        return await knex('documents').where('id', id).update(filteredData);
    }
};

async function initDb() {
    if (process.env.DB_SKIP_MIGRATION === 'true') {
        console.log('Skipping database migrations (DB_SKIP_MIGRATION=true).');
        return;
    }

    console.log('Checking database migrations...');
    try {
        await knex.migrate.latest();
        console.log('Database migrated successfully.');
    } catch (err) {
        if (err.name === 'MigrationLocked' || err.message.includes('already locked')) {
            console.warn('Database migration is already in progress by another process. Skipping...');
        } else {
            console.error('Migration failed:', err);
            // Don't throw, let the app try to start anyway
        }
    }

    try {
        // Seed initial data if needed (only if user table is empty)
        // We use a separate try-catch so seeding still works if migration was skipped but finished
        const userCount = await knex('users').count('id as count').first();
        if (userCount.count === 0) {
            console.log('Seeding initial data...');

            const adminPass = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
            const staffPass = process.env.INITIAL_STAFF_PASSWORD || 'staff123';
            const viewerPass = process.env.INITIAL_VIEWER_PASSWORD || 'viewer123';

            const [adminHash, staffHash, viewerHash] = await Promise.all([
                bcrypt.hash(adminPass, 10),
                bcrypt.hash(staffPass, 10),
                bcrypt.hash(viewerPass, 10)
            ]);

            await knex('users').insert([
                { username: 'admin', password: adminHash, name: 'Administrator', role: 'admin', department: 'IT' },
                { username: 'staff', password: staffHash, name: 'Staff Gudang', role: 'staff', department: 'Warehouse' },
                { username: 'viewer', password: viewerHash, name: 'Tamu', role: 'viewer', department: 'General' }
            ]);

            await knex('departments').insert([
                { name: 'IT' }, { name: 'Finance' }, { name: 'HR' }, { name: 'Warehouse' }, { name: 'General' }
            ]);

            await knex('roles').insert([
                {
                    id: 'admin', label: 'Administrator', access: JSON.stringify({
                        dashboard: ['view'],
                        inventory: ['view', 'create', 'edit', 'delete'],
                        documents: ['view', 'create', 'edit', 'delete'],
                        'tax-monitoring': ['view', 'create', 'edit', 'delete'],
                        'tax-summary': ['view', 'create', 'edit', 'delete'],
                        master: ['view', 'create', 'edit', 'delete']
                    })
                },
                {
                    id: 'staff', label: 'Staff Gudang', access: JSON.stringify({
                        dashboard: ['view'],
                        inventory: ['view', 'create', 'edit'],
                        documents: ['view', 'create'],
                        'tax-monitoring': ['view'],
                        'tax-summary': ['view']
                    })
                },
                {
                    id: 'viewer', label: 'Tamu / Viewer', access: JSON.stringify({
                        dashboard: ['view'],
                        inventory: ['view'],
                        documents: ['view'],
                        'tax-monitoring': ['view'],
                        'tax-summary': ['view']
                    })
                }
            ]);

            const inventorySeeds = [];
            for (let i = 1; i <= 100; i++) {
                inventorySeeds.push({ id: i, status: 'EMPTY', lastUpdated: null, box_data: null, history: JSON.stringify([]) });
            }
            await knex('inventory').insert(inventorySeeds);
            console.log('Initial seeding complete.');
        }
    } catch (err) {
        console.error('Migration/Seeding failed:', err);
    }
}

// Initialize
// Only run migrations/seeding if this is NOT the worker process
// We detect worker by checking if the process entry point includes 'worker.js'
export default db;
export { knex, initDb };
