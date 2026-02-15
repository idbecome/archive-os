import knexConfig from '../knexfile.js';
import knexLib from 'knex';
import dotenv from 'dotenv';
dotenv.config();

const knex = knexLib(knexConfig.development);

// Wrapper to mimic SQLite API (compat layer)
const db = {
    run: (sql, params, callback) => {
        // Handle INSERT lastID context
        knex.raw(sql, params || []) // Standard binding
            .then(result => {
                if (callback) {
                    const context = {
                        lastID: result[0] ? result[0].insertId : 0,
                        changes: result[0] ? result[0].affectedRows : 0
                    };
                    callback.call(context, null);
                }
            })
            .catch(err => {
                if (callback) callback(err);
            });
    },
    // More robust raw query wrapper for standard library calls
    raw: async (sql, params) => {
        const [rows] = await knex.raw(sql, params);
        return rows;
    },
    all: (sql, params, callback) => {
        knex.raw(sql, params || [])
            .then(result => {
                const rows = result[0];
                if (callback) callback(null, rows);
            })
            .catch(err => {
                if (callback) callback(err, null);
            });
    },
    get: (sql, params, callback) => {
        knex.raw(sql, params || [])
            .then(result => {
                const row = result[0] ? result[0][0] : null;
                if (callback) callback(null, row);
            })
            .catch(err => {
                if (callback) callback(err, null);
            });
    },
    close: () => {
        knex.destroy();
    },
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
            const DEFAULT_HASHED_PASSWORD = '$2b$10$TfDni0li9j0Iw3EenMzvv.Gx671emuXkgs5L80mFzI0vqj77ungqO';
            await knex('users').insert([
                { username: 'admin', password: DEFAULT_HASHED_PASSWORD, name: 'Administrator', role: 'admin', department: 'IT' },
                { username: 'staff', password: DEFAULT_HASHED_PASSWORD, name: 'Staff Gudang', role: 'staff', department: 'Warehouse' },
                { username: 'viewer', password: DEFAULT_HASHED_PASSWORD, name: 'Tamu', role: 'viewer', department: 'General' }
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
const isWorker = process.argv[1] && process.argv[1].includes('worker.js');
const isUtilityScript = process.argv[1] && (process.argv[1].includes('update_') || process.argv[1].includes('add_'));

if (!isWorker && !isUtilityScript) {
    initDb().then(() => {
        console.log('Database system ready (Main Process).');
    });
} else {
    console.log(`Database connection initialized for ${isWorker ? 'Worker' : 'Script'} (Skipping Migration).`);
}

export default db;
export { knex };
