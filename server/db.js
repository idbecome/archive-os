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
        return await knex('documents').where('id', id).update(filteredData);
    }
};

const initDb = async () => {
    console.log('Checking database migrations...');
    try {
        await knex.migrate.latest();
        console.log('Database migrated successfully.');
    } catch (err) {
        if (err.name === 'MigrationLocked' || err.message.includes('already locked')) {
            console.warn('Database migration is already in progress by another process. Skipping...');
        } else {
            console.error('Migration failed:', err);
            // In development, crash the process so the developer is forced to fix the schema
            if (process.env.NODE_ENV !== 'production') {
                process.exit(1);
            }
        }
    }

    try {
        // Seed initial data if needed (only if user table is empty)
        // We use a separate try-catch so seeding still works if migration was skipped but finished
        const userCountResult = await knex('users').count('id as count').first();
        const userCount = userCountResult ? (userCountResult.count || userCountResult['count(*)'] || 0) : 0; // Corrected variable name
        if (Number(userCount) === 0) {
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
                    id: 'admin', label: 'Administrator', access: {
                        dashboard: ['view'],
                        inventory: ['view', 'create', 'edit', 'delete'],
                        documents: ['view', 'create', 'edit', 'delete'],
                        'tax-monitoring': ['view', 'create', 'edit', 'delete'],
                        'tax-summary': ['view', 'create', 'edit', 'delete'],
                        master: ['view', 'create', 'edit', 'delete']
                    }
                },
                {
                    id: 'staff', label: 'Staff Gudang', access: {
                        dashboard: ['view'],
                        inventory: ['view', 'create', 'edit'],
                        documents: ['view', 'create'],
                        'tax-monitoring': ['view'],
                        'tax-summary': ['view']
                    }
                },
                {
                    id: 'viewer', label: 'Tamu / Viewer', access: {
                        dashboard: ['view'],
                        inventory: ['view'],
                        documents: ['view'],
                        'tax-monitoring': ['view'],
                        'tax-summary': ['view']
                    }
                }
            ]);
            console.log('User, Role, and Dept seeding complete.');
        }

        // Seed System Folders if empty
        const folderCountResult = await knex('folders').count('id as count').first();
        const folderCount = folderCountResult ? (folderCountResult.count || folderCountResult['count(*)'] || 0) : 0;
        if (Number(folderCount) === 0) {
            console.log('Seeding initial system folders...');
            await knex('folders').insert([
                { name: 'DataBox', privacy: 'public', owner: 'System' },
                { name: 'TaxAudit', privacy: 'public', owner: 'System' },
                { name: 'ApprovalDoc', privacy: 'public', owner: 'System' },
                { name: 'PUSTAKA', privacy: 'public', owner: 'System' },
                { name: 'SOP', privacy: 'public', owner: 'System' }
            ]);
        }

        // Seed Inventory Slots - Self Healing Logic
        // Memastikan slot 1 sampai 100 selalu tersedia di database
        const targetSlots = 100; 
        const existingSlots = await knex('inventory').select('id');
        const existingIds = new Set(existingSlots.map(s => s.id));
        
        const missingSlots = [];
        const racks = ['A', 'B', 'C', 'D', 'E'];
        
        for (let i = 1; i <= targetSlots; i++) {
            if (!existingIds.has(i)) {
                const idx = i - 1;
                const rackIdx = Math.floor(idx / 20);
                const rack = racks[rackIdx] || 'Z';
                const remainder = idx % 20;
                const shelf = Math.floor(remainder / 4) + 1;
                const position = (remainder % 4) + 1;
                
                missingSlots.push({
                    id: i,
                    status: 'EMPTY',
                    rack,
                    shelf,
                    position,
                    history: JSON.stringify([]) // Simpan sebagai string JSON kosong untuk MySQL
                });
            }
        }

        if (missingSlots.length > 0) {
            console.log(`Inisialisasi Database: Menambahkan ${missingSlots.length} slot yang hilang...`);
            await knex('inventory').insert(missingSlots);
            console.log('Sinkronisasi slot inventory berhasil.');

            // PostgreSQL Sequence Fix: Reset sequence agar ID berikutnya tidak bentrok
            if (knex.client.config.client === 'pg') {
                await knex.raw('SELECT setval(\'inventory_id_seq\', (SELECT MAX(id) FROM inventory))');
            }
        }

        // Self-Healing: Ensure tax_audit_notes table exists and has correct schema (Fix for 500 Error)
        let hasTaxAuditNotes = await knex.schema.hasTable('tax_audit_notes');

        // CHECK ID TYPE: If it's STRING, we must recreate the table because backend does NOT send ID (needs Auto-Increment)
        if (hasTaxAuditNotes) {
            const columnInfo = await knex('tax_audit_notes').columnInfo();
            // Check if ID is varchar/string/text
            const isIdString = columnInfo.id && (String(columnInfo.id.type).toLowerCase().includes('char') || String(columnInfo.id.type).toLowerCase().includes('text'));
            
            if (isIdString) {
                console.log('Self-healing: Detected incompatible ID type (String) in tax_audit_notes. Recreating table as Auto-Increment...');
                await knex.schema.dropTable('tax_audit_notes');
                hasTaxAuditNotes = false; // Mark as not existing so it gets created below
            }
        }

        if (!hasTaxAuditNotes) {
            console.log('Self-healing: Creating missing tax_audit_notes table...');
            await knex.schema.createTable('tax_audit_notes', table => {
                table.increments('id').primary(); // FIX: Use Auto-Increment Integer
                table.string('auditId').notNullable();
                table.integer('stepIndex').notNullable();
                table.string('user').notNullable();
                table.text('text').notNullable();
                table.timestamp('timestamp').defaultTo(knex.fn.now());
                
                // CamelCase columns to match backend controller
                table.string('attachmentName').nullable();
                table.string('attachmentUrl').nullable();
                table.string('attachmentType').nullable();
                table.string('attachmentSize').nullable();
            });
        } else {
            // Ensure columns match backend expectations (camelCase)
            const hasAttachmentName = await knex.schema.hasColumn('tax_audit_notes', 'attachmentName');
            if (!hasAttachmentName) {
                console.log('Self-healing: Patching tax_audit_notes schema...');
                await knex.schema.alterTable('tax_audit_notes', table => {
                    table.string('attachmentName').nullable();
                    table.string('attachmentUrl').nullable();
                    table.string('attachmentType').nullable();
                    table.string('attachmentSize').nullable();
                });
            }
        }
    } catch (err) {
        console.error('Migration/Seeding failed:', err);
    }
};

// Initialize
// Only run migrations/seeding if this is NOT the worker process
// We detect worker by checking if the process entry point includes 'worker.js'
export default db;
export { knex, initDb };
