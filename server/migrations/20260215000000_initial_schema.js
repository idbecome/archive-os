export const up = async (knex) => {
    // --- Create Tables ---

    await knex.schema.createTableIfNotExists('users', (table) => {
        table.increments('id').primary();
        table.string('username').unique();
        table.string('password');
        table.string('name');
        table.string('role', 50);
        table.string('department', 100);
    });

    await knex.schema.createTableIfNotExists('departments', (table) => {
        table.increments('id').primary();
        table.string('name', 100).unique();
    });

    await knex.schema.createTableIfNotExists('roles', (table) => {
        table.string('id', 50).primary();
        table.string('label');
        table.text('access');
    });

    await knex.schema.createTableIfNotExists('inventory', (table) => {
        table.integer('id').primary();
        table.string('status', 50);
        table.dateTime('lastUpdated');
        table.specificType('box_data', 'LONGTEXT');
        table.text('history');
    });

    await knex.schema.createTableIfNotExists('folders', (table) => {
        table.increments('id').primary();
        table.integer('parentId');
        table.string('name');
        table.string('privacy', 50);
        table.text('allowedDepts');
        table.text('allowedUsers');
        table.string('owner', 100);
        table.dateTime('createdAt').defaultTo(knex.fn.now());
    });

    await knex.schema.createTableIfNotExists('documents', (table) => {
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

    await knex.schema.createTableIfNotExists('logs', (table) => {
        table.increments('id').primary();
        table.dateTime('timestamp').defaultTo(knex.fn.now());
        table.string('user', 100);
        table.string('action', 100);
        table.text('details');
        table.text('oldValue');
        table.text('newValue');
    });

    await knex.schema.createTableIfNotExists('tax_audits', (table) => {
        table.string('id').primary();
        table.string('title');
        table.string('status', 50);
        table.integer('currentStep');
        table.text('steps');
        table.string('letterNumber', 100);
        table.dateTime('startDate');
    });

    await knex.schema.createTableIfNotExists('tax_summaries', (table) => {
        table.string('id').primary();
        table.string('type', 20);
        table.string('month', 50);
        table.integer('year');
        table.integer('pembetulan').defaultTo(0);
        table.specificType('data', 'LONGTEXT');
    });

    await knex.schema.createTableIfNotExists('external_items', (table) => {
        table.increments('id').primary();
        table.string('boxId', 100);
        table.string('destination');
        table.dateTime('sentDate');
        table.string('sender', 100);
        table.text('boxData');
        table.text('history');
    });

    await knex.schema.createTableIfNotExists('boxes', (table) => {
        table.increments('id').primary();
        table.integer('inventory_id'); //.references('id').inTable('inventory');
        table.string('box_id', 100);
        table.dateTime('created_at').defaultTo(knex.fn.now());
        table.index('box_id');
        table.index('inventory_id');
    });

    await knex.schema.createTableIfNotExists('ordners', (table) => {
        table.increments('id').primary();
        table.integer('box_ref_id').unsigned();
        table.string('no_ordner', 100);
        table.string('period', 100);
        table.foreign('box_ref_id').references('id').inTable('boxes').onDelete('CASCADE');
    });

    await knex.schema.createTableIfNotExists('invoices', (table) => {
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

    await knex.schema.createTableIfNotExists('inventory_items', (table) => {
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

    await knex.schema.createTableIfNotExists('tax_objects', (table) => {
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

    await knex.schema.createTableIfNotExists('master_tax_objects', (table) => {
        table.increments('id').primary();
        table.string('tax_type', 50);
        table.string('code', 100);
        table.string('name');
        table.text('note');
        table.decimal('rate', 5, 2);
        table.specificType('vector', 'LONGTEXT');
        table.dateTime('created_at').defaultTo(knex.fn.now());
    });

    await knex.schema.createTableIfNotExists('job_queue', (table) => {
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

    await knex.schema.createTableIfNotExists('document_approvals', (table) => {
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

    await knex.schema.createTableIfNotExists('approval_steps', (table) => {
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

    await knex.schema.createTableIfNotExists('approval_flows', (table) => {
        table.increments('id').primary();
        table.string('name');
        table.text('description');
        table.specificType('steps', 'LONGTEXT');
    });

    await knex.schema.createTableIfNotExists('pustaka_guides', (table) => {
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

    await knex.schema.createTableIfNotExists('pustaka_slides', (table) => {
        table.increments('id').primary();
        table.integer('guide_id').unsigned();
        table.string('title');
        table.text('content');
        table.text('image');
        table.integer('step_order');
        table.foreign('guide_id').references('id').inTable('pustaka_guides').onDelete('CASCADE');
    });

    await knex.schema.createTableIfNotExists('pustaka_categories', (table) => {
        table.increments('id').primary();
        table.string('name', 100).unique();
    });

    await knex.schema.createTableIfNotExists('comments', (table) => {
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

    await knex.schema.createTableIfNotExists('tax_audit_notes', (table) => {
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
