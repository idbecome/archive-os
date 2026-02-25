
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
    console.warn('⚠️  [MIGRATION DOWN] fix_workflow_schema: Removing workflow schema fix columns');

    if (await knex.schema.hasTable('approval_steps')) {
        const cols = ['flow_id', 'order_index', 'step_name', 'approver_role'];
        for (const col of cols) {
            if (await knex.schema.hasColumn('approval_steps', col)) {
                await knex.schema.alterTable('approval_steps', (table) => {
                    table.dropColumn(col);
                });
            }
        }
    }

    if (await knex.schema.hasTable('document_approvals')) {
        const cols = ['document_id', 'current_step_id', 'requester'];
        for (const col of cols) {
            if (await knex.schema.hasColumn('document_approvals', col)) {
                await knex.schema.alterTable('document_approvals', (table) => {
                    table.dropColumn(col);
                });
            }
        }
    }
};
