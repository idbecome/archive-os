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
    // --- SELF-HEALING FOR APPROVALS (Relational Schema) ---
    try {
        const hasDocApprovals = await knex.schema.hasTable('document_approvals');
        if (!hasDocApprovals) {
            console.log('Self-healing: Creating document_approvals table...');
            await knex.schema.createTable('document_approvals', table => {
                table.increments('id').primary();
                table.string('title').notNullable();
                table.text('description').nullable();
                table.string('division').nullable();
                table.string('requester_name').nullable();
                table.string('requester_username').nullable();
                table.string('status').defaultTo('Pending');
                table.integer('current_step_index').defaultTo(0);
                table.string('attachment_url').nullable();
                table.string('attachment_name').nullable();
                table.text('ocr_content').nullable();
                table.integer('flow_id').unsigned().nullable();
                table.timestamps(true, true);
            });
        } else {
            // Patch existing document_approvals table if columns are missing
            const hasUpdatedAt = await knex.schema.hasColumn('document_approvals', 'updated_at');
            const hasCreatedAt = await knex.schema.hasColumn('document_approvals', 'created_at');
            if (!hasUpdatedAt || !hasCreatedAt) {
                await knex.schema.alterTable('document_approvals', table => {
                    if (!hasUpdatedAt) table.timestamp('updated_at').defaultTo(knex.fn.now());
                    if (!hasCreatedAt) table.timestamp('created_at').defaultTo(knex.fn.now());
                });
            }
        }

        const hasStepsTable = await knex.schema.hasTable('approval_steps');
        if (!hasStepsTable) {
            console.log('Self-healing: Creating approval_steps table...');
            await knex.schema.createTable('approval_steps', table => {
                table.increments('id').primary();
                table.integer('approval_id').unsigned().references('id').inTable('document_approvals').onDelete('CASCADE');
                table.string('approver_name').nullable();
                table.string('approver_username').nullable();
                table.string('status').defaultTo('Pending');
                table.text('note').nullable();
                table.timestamp('action_date').nullable();
                table.string('attachment_url').nullable();
                table.string('attachment_name').nullable();
                table.integer('step_index').defaultTo(0);
                table.string('node_id').nullable();
            });
        }
    } catch (e) { console.warn('Approval self-healing error:', e.message); }

    // --- SELF-HEALING FOR SOP FLOWS ---
    try {
        const hasSopFlows = await knex.schema.hasTable('sop_flows');
        if (!hasSopFlows) {
            console.log('Self-healing: Creating sop_flows table...');
            await knex.schema.createTable('sop_flows', table => {
                table.increments('id').primary();
                table.string('title').notNullable();
                table.text('description').nullable();
                table.string('category').nullable();
                table.text('steps').nullable();
                table.text('visual_config').nullable();
                table.string('owner').nullable();
                table.string('privacy_type', 50).defaultTo('public');
                table.text('allowed_departments').nullable();
                table.text('allowed_users', 50).nullable();
                table.timestamps(true, true);
            });
        } else {
            // Patch existing sop_flows table
            const columnsToAdd = [
                { name: 'privacy_type', type: 'string', size: 50, default: 'public' },
                { name: 'allowed_departments', type: 'text' },
                { name: 'allowed_users', type: 'text' }
            ];
            for (const col of columnsToAdd) {
                const exists = await knex.schema.hasColumn('sop_flows', col.name);
                if (!exists) {
                    await knex.schema.alterTable('sop_flows', table => {
                        let builder;
                        if (col.type === 'string') builder = table.string(col.name, col.size);
                        else builder = table.text(col.name);

                        if (col.default !== undefined) builder.defaultTo(col.default);
                        else builder.nullable();
                    });
                }
            }
        }
    } catch (e) { console.warn('SOP Flows self-healing error:', e.message); }

    // --- STEP 0: CRITICAL SELF-HEALING (Run BEFORE migrations) ---
    try {
        const hasApprovalSteps = await knex.schema.hasTable('approval_steps');
        if (hasApprovalSteps) {
            const hasFlowId = await knex.schema.hasColumn('approval_steps', 'flow_id');
            if (!hasFlowId) {
                console.log('Self-healing: Patching approval_steps schema to unblock migrations...');
                await knex.schema.alterTable('approval_steps', table => {
                    table.integer('flow_id').unsigned().after('id');
                    table.integer('order_index').defaultTo(0);
                    table.string('step_name');
                    table.string('approver_role');
                });
            }
        }
    } catch (e) {
        console.warn('Pre-migration patch skipped or already applied:', e.message);
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
            // Biarkan proses berlanjut ke seeding meskipun migrasi ada kendala minor (seperti duplicate index)
        }
    }

    try {
        // Seed initial data if needed (only if user table is empty)
        // We use a separate try-catch so seeding still works if migration was skipped but finished
        const hasUsersTable = await knex.schema.hasTable('users');
        let userCount = 0;
        if (hasUsersTable) {
            const userCountResult = await knex('users').count('id as count').first();
            userCount = userCountResult ? (userCountResult.count || userCountResult['count(*)'] || 0) : 0;
        }

        if (!hasUsersTable || Number(userCount) === 0) {
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

        // --- FIX: Ensure Tax Tables Exist (Bypass blocked migrations) ---
        const hasTaxObjects = await knex.schema.hasTable('tax_objects');
        if (!hasTaxObjects) {
            console.log('Self-healing: Creating missing tax_objects table...');
            await knex.schema.createTable('tax_objects', table => {
                table.increments('id').primary();
                table.string('tax_type');
                table.string('tax_object_code');
                table.string('tax_object_name');
                table.decimal('rate', 10, 4);
                table.boolean('is_pph21_bukan_pegawai').defaultTo(false);
                table.boolean('use_ppn').defaultTo(true);
                table.string('markup_mode').defaultTo('none');
                // Add missing columns found in error log to support full data save
                table.string('name').nullable();
                table.string('id_type').nullable();
                table.string('identity_number').nullable();
                table.string('email').nullable();
                table.decimal('dpp', 15, 2).defaultTo(0);
                table.decimal('discount', 15, 2).defaultTo(0);
                table.decimal('dpp_net', 15, 2).defaultTo(0);
                table.decimal('pph', 15, 2).defaultTo(0);
                table.decimal('ppn', 15, 2).defaultTo(0);
                table.decimal('total_payable', 15, 2).defaultTo(0);
            });
        } else {
            // Patch existing tax_objects table if columns are missing
            console.log('Self-healing: Checking tax_objects columns...');
            const columnsToPatch = [
                { name: 'is_pph21_bukan_pegawai', type: 'boolean', default: false },
                { name: 'name', type: 'string' },
                { name: 'id_type', type: 'string' },
                { name: 'identity_number', type: 'string' },
                { name: 'email', type: 'string' },
                { name: 'markup_mode', type: 'string', default: 'none' },
                { name: 'use_ppn', type: 'boolean', default: true },
                { name: 'dpp', type: 'decimal', precision: [15, 2], default: 0 },
                { name: 'discount', type: 'decimal', precision: [15, 2], default: 0 },
                { name: 'dpp_net', type: 'decimal', precision: [15, 2], default: 0 },
                { name: 'pph', type: 'decimal', precision: [15, 2], default: 0 },
                { name: 'ppn', type: 'decimal', precision: [15, 2], default: 0 },
                { name: 'total_payable', type: 'decimal', precision: [15, 2], default: 0 }
            ];

            for (const col of columnsToPatch) {
                const exists = await knex.schema.hasColumn('tax_objects', col.name);
                if (!exists) {
                    await knex.schema.alterTable('tax_objects', table => {
                        let colBuilder;
                        if (col.type === 'boolean') colBuilder = table.boolean(col.name);
                        else if (col.type === 'string') colBuilder = table.string(col.name);
                        else if (col.type === 'decimal') colBuilder = table.decimal(col.name, ...col.precision);

                        if (col.default !== undefined) colBuilder.defaultTo(col.default);
                        else colBuilder.nullable();
                    });
                }
            }
        }

        const hasTaxWp = await knex.schema.hasTable('tax_wp');
        if (!hasTaxWp) {
            console.log('Self-healing: Creating missing tax_wp table...');
            await knex.schema.createTable('tax_wp', table => {
                table.increments('id').primary();
                table.string('name');
                table.string('id_type').defaultTo('NPWP');
                table.string('identity_number').unique();
                table.string('email').nullable();
                table.string('tax_type');
                table.string('tax_object_code');
                table.string('tax_object_name');
                table.string('markup_mode').defaultTo('none');
                table.boolean('is_pph21_bukan_pegawai').defaultTo(false);
                table.boolean('use_ppn').defaultTo(true);
                table.timestamp('created_at').defaultTo(knex.fn.now());
                // Add calculation columns
                table.decimal('dpp', 15, 2).defaultTo(0);
                table.decimal('discount', 15, 2).defaultTo(0);
                table.decimal('dpp_net', 15, 2).defaultTo(0);
                table.decimal('pph', 15, 2).defaultTo(0);
                table.decimal('ppn', 15, 2).defaultTo(0);
                table.decimal('total_payable', 15, 2).defaultTo(0);
            });
        } else {
            // Patch existing tax_wp table
            console.log('Self-healing: Checking tax_wp columns...');
            const wpColumns = [
                { name: 'tax_type', type: 'string' },
                { name: 'tax_object_code', type: 'string' },
                { name: 'tax_object_name', type: 'string' },
                { name: 'markup_mode', type: 'string', default: 'none' },
                { name: 'use_ppn', type: 'boolean', default: true },
                { name: 'is_pph21_bukan_pegawai', type: 'boolean', default: false },
                { name: 'dpp', type: 'decimal', precision: [15, 2], default: 0 },
                { name: 'discount', type: 'decimal', precision: [15, 2], default: 0 },
                { name: 'dpp_net', type: 'decimal', precision: [15, 2], default: 0 },
                { name: 'pph', type: 'decimal', precision: [15, 2], default: 0 },
                { name: 'ppn', type: 'decimal', precision: [15, 2], default: 0 },
                { name: 'total_payable', type: 'decimal', precision: [15, 2], default: 0 }
            ];

            for (const col of wpColumns) {
                const exists = await knex.schema.hasColumn('tax_wp', col.name);
                if (!exists) {
                    await knex.schema.alterTable('tax_wp', table => {
                        let colBuilder;
                        if (col.type === 'boolean') colBuilder = table.boolean(col.name);
                        else if (col.type === 'decimal') colBuilder = table.decimal(col.name, ...col.precision);
                        else colBuilder = table.string(col.name);

                        colBuilder.defaultTo(col.default);
                    });
                }
            }
            // Pastikan identity_number unik untuk mencegah duplikasi saat import
            try {
                const [indexes] = await knex.raw("SHOW INDEX FROM tax_wp WHERE Column_name = 'identity_number'");
                const isUnique = indexes.some(idx => idx.Non_unique === 0);

                if (!isUnique) {
                    console.log('Self-healing: Adding unique constraint to tax_wp.identity_number...');
                    await knex.schema.alterTable('tax_wp', table => {
                        table.unique('identity_number');
                    });
                }
            } catch (e) { /* Ignore if already unique */ }
        }

        // Self-Healing: Ensure comments table exists (Fix for 500 Error on Document Chat)
        const hasCommentsTable = await knex.schema.hasTable('comments');
        if (!hasCommentsTable) {
            console.log('Self-healing: Creating missing comments table...');
            await knex.schema.createTable('comments', table => {
                table.string('id').primary();
                table.string('documentId').notNullable();
                table.string('user').notNullable();
                table.text('text').notNullable();
                table.timestamp('timestamp').defaultTo(knex.fn.now());
                table.string('attachment').nullable();
                table.string('attachment_name').nullable();
                table.string('attachment_type').nullable();
            });
            console.log('Self-healing: comments table created successfully.');
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
