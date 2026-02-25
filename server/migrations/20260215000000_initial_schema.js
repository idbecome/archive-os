export const up = async (knex) => {
    // --- Create Tables ---

    if (!(await knex.schema.hasTable('users'))) {
        await knex.schema.createTable('users', (table) => {
            table.increments('id').primary();
            table.string('username').unique();
            table.string('password');
            table.string('name');
            table.string('role', 50);
            table.string('department', 100);
        });
    }

    if (!(await knex.schema.hasTable('departments'))) {
        await knex.schema.createTable('departments', (table) => {
            table.increments('id').primary();
            table.string('name', 100).unique();
        });
    }

    if (!(await knex.schema.hasTable('roles'))) {
        await knex.schema.createTable('roles', (table) => {
            table.string('id', 50).primary();
            table.string('label');
            table.text('access');
        });
    }

    if (!(await knex.schema.hasTable('inventory'))) {
        await knex.schema.createTable('inventory', (table) => {
            table.integer('id').primary();
            table.string('status', 50);
            table.dateTime('lastUpdated');
            table.specificType('box_data', 'LONGTEXT');
            table.text('history');
        });
    }

    if (!(await knex.schema.hasTable('folders'))) {
        await knex.schema.createTable('folders', (table) => {
            table.increments('id').primary();
            table.integer('parentId');
            table.string('name');
            table.string('privacy', 50);
            table.text('allowedDepts');
            table.text('allowedUsers');
            table.string('owner', 100);
            table.dateTime('createdAt').defaultTo(knex.fn.now());
        });
    }

    if (!(await knex.schema.hasTable('documents'))) {
        await knex.schema.createTable('documents', (table) => {
            table.string('id').primary();
            table.string('title');
            table.string('type', 50);
            table.string('size', 50);
            table.dateTime('uploadDate');
            table.text('url');
            table.string('folderId');
            table.string('department', 100);
            table.string('owner', 100);
            table.specificType('ocrContent', 'LONGTEXT');
            table.string('auditId');
            table.integer('stepIndex');
            table.specificType('fileData', 'LONGTEXT');
            table.specificType('versionsHistory', 'LONGTEXT');
            table.integer('version').defaultTo(1);
            table.string('status', 50).defaultTo('ready');
            table.specificType('vector', 'LONGTEXT');
        });
    }

    if (!(await knex.schema.hasTable('logs'))) {
        await knex.schema.createTable('logs', (table) => {
            table.increments('id').primary();
            table.dateTime('timestamp').defaultTo(knex.fn.now());
            table.string('user', 100);
            table.string('action', 100);
            table.text('details');
            table.text('oldValue');
            table.text('newValue');
        });
    }

    if (!(await knex.schema.hasTable('tax_audits'))) {
        await knex.schema.createTable('tax_audits', (table) => {
            table.string('id').primary();
            table.string('title');
            table.string('status', 50);
            table.integer('currentStep');
            table.text('steps');
            table.string('letterNumber', 100);
            table.dateTime('startDate');
        });
    }

    if (!(await knex.schema.hasTable('tax_summaries'))) {
        await knex.schema.createTable('tax_summaries', (table) => {
            table.string('id').primary();
            table.string('type', 20);
            table.string('month', 50);
            table.integer('year');
            table.integer('pembetulan').defaultTo(0);
            table.specificType('data', 'LONGTEXT');
        });
    }

    if (!(await knex.schema.hasTable('external_items'))) {
        await knex.schema.createTable('external_items', (table) => {
            table.increments('id').primary();
            table.string('boxId', 100);
            table.string('destination');
            table.dateTime('sentDate');
            table.string('sender', 100);
            table.text('boxData');
            table.text('history');
        });
    }

    if (!(await knex.schema.hasTable('boxes'))) {
        await knex.schema.createTable('boxes', (table) => {
            table.increments('id').primary();
            table.integer('inventory_id'); //.references('id').inTable('inventory');
            table.string('box_id', 100);
            table.dateTime('created_at').defaultTo(knex.fn.now());
            table.index('box_id');
            table.index('inventory_id');
        });
    }

    if (!(await knex.schema.hasTable('ordners'))) {
        await knex.schema.createTable('ordners', (table) => {
            table.increments('id').primary();
            table.integer('box_ref_id').unsigned();
            table.string('no_ordner', 100);
            table.string('period', 100);
            table.foreign('box_ref_id').references('id').inTable('boxes').onDelete('CASCADE');
        });
    }

    if (!(await knex.schema.hasTable('invoices'))) {
        await knex.schema.createTable('invoices', (table) => {
            table.increments('id').primary();
            table.integer('ordner_ref_id').unsigned();
            table.string('invoice_no');
            table.string('vendor');
            table.string('payment_date', 100);
            table.text('file_url');
            table.string('file_name');
            table.specificType('ocr_content', 'LONGTEXT');
            table.index('invoice_no');
            table.index('vendor');
            table.foreign('ordner_ref_id').references('id').inTable('ordners').onDelete('CASCADE');
        });
    }

    if (!(await knex.schema.hasTable('inventory_items'))) {
        await knex.schema.createTable('inventory_items', (table) => {
            table.increments('id').primary();
            table.integer('inventory_id');
            table.string('box_id', 100);
            table.string('ordner_id', 100);
            table.string('invoice_no');
            table.string('vendor');
            table.dateTime('date');
            table.decimal('amount', 15, 2);
            table.text('file_url');
            table.specificType('ocr_content', 'LONGTEXT');
            table.dateTime('created_at').defaultTo(knex.fn.now());
            table.index(['invoice_no', 'vendor']);
        });
    }

    // --- TAX MODULE ---
    if (await knex.schema.hasTable('tax_objects')) {
        const hasIdentityNumber = await knex.schema.hasColumn('tax_objects', 'identity_number');
        if (!hasIdentityNumber) {
            // This is the old 2024 master data table, drop it to let 2026 user data table be created
            await knex.schema.dropTable('tax_objects');
        }
    }

    if (!(await knex.schema.hasTable('tax_objects'))) {
        await knex.schema.createTable('tax_objects', (table) => {
            table.increments('id').primary();
            table.string('id_type', 50);
            table.string('identity_number', 100);
            table.string('name');
            table.string('email');
            table.string('tax_type', 50);
            table.string('tax_object_code', 100);
            table.string('tax_object_name');
            table.decimal('dpp', 15, 2);
            table.decimal('rate', 5, 2);
            table.decimal('pph', 15, 2);
            table.decimal('ppn', 15, 2);
            table.decimal('total_payable', 15, 2);
            table.decimal('discount', 15, 2);
            table.decimal('dpp_net', 15, 2);
            table.dateTime('created_at').defaultTo(knex.fn.now());
        });
    }

    if (!(await knex.schema.hasTable('master_tax_objects'))) {
        await knex.schema.createTable('master_tax_objects', (table) => {
            table.increments('id').primary();
            table.string('tax_type', 50);
            table.string('code', 100);
            table.string('name');
            table.text('note');
            table.decimal('rate', 5, 2);
            table.specificType('vector', 'LONGTEXT');
            table.dateTime('created_at').defaultTo(knex.fn.now());
        });
    }

    if (!(await knex.schema.hasTable('job_queue'))) {
        await knex.schema.createTable('job_queue', (table) => {
            table.increments('id').primary();
            table.string('name');
            table.specificType('data', 'LONGTEXT');
            table.string('status', 50).defaultTo('waiting');
            table.integer('progress').defaultTo(0);
            table.dateTime('created_at').defaultTo(knex.fn.now());
            table.dateTime('processed_at');
            table.dateTime('finished_at');
            table.text('error');
        });
    }

    if (!(await knex.schema.hasTable('document_approvals'))) {
        await knex.schema.createTable('document_approvals', (table) => {
            table.increments('id').primary();
            table.text('title');
            table.text('description');
            table.text('division');
            table.text('requester_name');
            table.text('requester_username');
            table.text('attachment_url');
            table.text('attachment_name');
            table.string('status', 50).defaultTo('Pending');
            table.integer('current_step_index').defaultTo(0);
            table.dateTime('created_at').defaultTo(knex.fn.now());
            table.specificType('ocr_content', 'LONGTEXT');
        });
    }

    if (!(await knex.schema.hasTable('approval_steps'))) {
        await knex.schema.createTable('approval_steps', (table) => {
            table.increments('id').primary();
            table.integer('approval_id').unsigned();
            table.integer('step_index');
            table.text('approver_username');
            table.text('approver_name');
            table.string('status', 50).defaultTo('Pending');
            table.dateTime('action_date');
            table.text('note');
            table.text('attachment_url');
            table.text('attachment_name');
            table.foreign('approval_id').references('id').inTable('document_approvals').onDelete('CASCADE');
        });
    }

    if (!(await knex.schema.hasTable('approval_flows'))) {
        await knex.schema.createTable('approval_flows', (table) => {
            table.increments('id').primary();
            table.string('name');
            table.text('description');
            table.specificType('steps', 'LONGTEXT');
        });
    }

    if (!(await knex.schema.hasTable('pustaka_guides'))) {
        await knex.schema.createTable('pustaka_guides', (table) => {
            table.increments('id').primary();
            table.string('title');
            table.text('description');
            table.string('category', 100);
            table.string('icon', 50);
            table.dateTime('created_at').defaultTo(knex.fn.now());
            table.string('privacy', 50).defaultTo('public');
            table.text('allowed_depts');
            table.text('allowed_users');
            table.string('owner', 100);
        });
    }

    if (!(await knex.schema.hasTable('pustaka_slides'))) {
        await knex.schema.createTable('pustaka_slides', (table) => {
            table.increments('id').primary();
            table.integer('guide_id').unsigned();
            table.string('title');
            table.text('content');
            table.text('image');
            table.integer('step_order');
            table.foreign('guide_id').references('id').inTable('pustaka_guides').onDelete('CASCADE');
        });
    }

    if (!(await knex.schema.hasTable('pustaka_categories'))) {
        await knex.schema.createTable('pustaka_categories', (table) => {
            table.increments('id').primary();
            table.string('name', 100).unique();
        });
    }

    if (!(await knex.schema.hasTable('comments'))) {
        await knex.schema.createTable('comments', (table) => {
            table.increments('id').primary();
            table.string('documentId');
            table.string('user', 100);
            table.text('text');
            table.dateTime('timestamp').defaultTo(knex.fn.now());
            table.text('attachmentUrl');
            table.text('attachmentName');
            table.string('attachmentType', 100);
            table.string('attachmentSize', 50);
        });
    }

    if (!(await knex.schema.hasTable('tax_audit_notes'))) {
        await knex.schema.createTable('tax_audit_notes', (table) => {
            table.increments('id').primary();
            table.string('auditId');
            table.integer('stepIndex');
            table.string('user', 100);
            table.text('text');
            table.dateTime('timestamp').defaultTo(knex.fn.now());
            table.text('attachmentUrl');
            table.text('attachmentName');
            table.string('attachmentType', 100);
            table.string('attachmentSize', 50);
        });
    }
};

export const down = async (knex) => {
    // Ordered drop to avoid FK issues
    const tables = [
        'tax_audit_notes', 'comments', 'pustaka_slides', 'pustaka_categories', 'pustaka_guides',
        'approval_flows', 'approval_steps', 'document_approvals', 'job_queue', 'master_tax_objects',
        'tax_objects', 'inventory_items', 'invoices', 'ordners', 'boxes', 'external_items',
        'tax_summaries', 'tax_audits', 'logs', 'documents', 'folders', 'inventory', 'roles',
        'departments', 'users'
    ];
    for (const table of tables) {
        await knex.schema.dropTableIfExists(table);
    }
};
