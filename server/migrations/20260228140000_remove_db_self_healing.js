export const up = async function (knex) {
    // 1. Officially define document_approvals missing columns previously patched in db.js
    const hasDocApprovals = await knex.schema.hasTable('document_approvals');
    if (hasDocApprovals) {
        const hasUpdatedAt = await knex.schema.hasColumn('document_approvals', 'updated_at');
        const hasCreatedAt = await knex.schema.hasColumn('document_approvals', 'created_at');
        if (!hasUpdatedAt || !hasCreatedAt) {
            await knex.schema.alterTable('document_approvals', table => {
                if (!hasUpdatedAt) table.timestamp('updated_at').defaultTo(knex.fn.now());
                if (!hasCreatedAt) table.timestamp('created_at').defaultTo(knex.fn.now());
            });
            console.log('[Migration] Added timestamps to document_approvals');
        }
    } else {
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
        console.log('[Migration] Created document_approvals table completely');
    }

    // 2. Officially define approval_steps missing columns previously patched in db.js
    const hasApprovalSteps = await knex.schema.hasTable('approval_steps');
    if (hasApprovalSteps) {
        const hasFlowId = await knex.schema.hasColumn('approval_steps', 'flow_id');
        if (!hasFlowId) {
            await knex.schema.alterTable('approval_steps', table => {
                table.integer('flow_id').unsigned();
                table.integer('order_index').defaultTo(0);
                table.string('step_name');
                table.string('approver_role');
            });
            console.log('[Migration] Added missing schema columns to approval_steps');
        }
    } else {
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
            table.integer('flow_id').unsigned();
            table.integer('order_index').defaultTo(0);
            table.string('step_name');
            table.string('approver_role');
        });
        console.log('[Migration] Created approval_steps table completely');
    }

    // 3. Officially create tax_wp table. This was solely created in db.js previously.
    const hasTaxWp = await knex.schema.hasTable('tax_wp');
    if (!hasTaxWp) {
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
            table.decimal('dpp', 15, 2).defaultTo(0);
            table.decimal('discount', 15, 2).defaultTo(0);
            table.decimal('dpp_net', 15, 2).defaultTo(0);
            table.decimal('pph', 15, 2).defaultTo(0);
            table.decimal('ppn', 15, 2).defaultTo(0);
            table.decimal('total_payable', 15, 2).defaultTo(0);
        });
        console.log('[Migration] Created tax_wp table completely');
    }
};

export const down = async function (knex) {
    // Purposeful no-op. Rolling back core architectural patches might
    // violently crash the app since the self-healing scripts are being removed.
    console.log('[Migration Down] Skipping safe rollback for DB hardening migration.');
    return Promise.resolve();
};
