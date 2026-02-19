
export const up = async (knex) => {
    // Fix approval_steps table
    if (await knex.schema.hasTable('approval_steps')) {
        if (!(await knex.schema.hasColumn('approval_steps', 'flow_id'))) {
            await knex.schema.alterTable('approval_steps', table => {
                table.integer('flow_id').unsigned();
            });
        }
        if (!(await knex.schema.hasColumn('approval_steps', 'order_index'))) {
            await knex.schema.alterTable('approval_steps', table => {
                table.integer('order_index').defaultTo(0);
            });
        }
        if (!(await knex.schema.hasColumn('approval_steps', 'step_name'))) {
            await knex.schema.alterTable('approval_steps', table => {
                table.string('step_name');
            });
        }
        if (!(await knex.schema.hasColumn('approval_steps', 'approver_role'))) {
            await knex.schema.alterTable('approval_steps', table => {
                table.string('approver_role');
            });
        }
    }

    // Fix document_approvals table
    if (await knex.schema.hasTable('document_approvals')) {
        if (!(await knex.schema.hasColumn('document_approvals', 'document_id'))) {
            await knex.schema.alterTable('document_approvals', table => {
                table.string('document_id');
            });
        }
        if (!(await knex.schema.hasColumn('document_approvals', 'flow_id'))) {
            await knex.schema.alterTable('document_approvals', table => {
                table.integer('flow_id').unsigned();
            });
        }
        if (!(await knex.schema.hasColumn('document_approvals', 'current_step_id'))) {
            await knex.schema.alterTable('document_approvals', table => {
                table.integer('current_step_id').unsigned();
            });
        }
        if (!(await knex.schema.hasColumn('document_approvals', 'requester'))) {
            await knex.schema.alterTable('document_approvals', table => {
                table.string('requester');
            });
        }
    }
};

export const down = async (knex) => {
    if (await knex.schema.hasTable('approval_steps')) {
        await knex.schema.alterTable('approval_steps', (table) => {
            // Check existence before dropping is hard with standard knex API in down, 
            // usually down assumes up succeeded. 
            // But we can just try/catch distinct drops or just leave them if we want to be safe.
            // For now, let's just attempt drop.
            table.dropColumn('flow_id');
            table.dropColumn('order_index');
            table.dropColumn('step_name');
            table.dropColumn('approver_role');
        });
    }

    if (await knex.schema.hasTable('document_approvals')) {
        await knex.schema.alterTable('document_approvals', (table) => {
            table.dropColumn('document_id');
            table.dropColumn('current_step_id');
            table.dropColumn('requester');
            // Flow_id might be used by other parts, careful.
        });
    }
};
