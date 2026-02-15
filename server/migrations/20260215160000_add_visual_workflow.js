
export const up = async (knex) => {
    // Add visual_config to approval_flows to store React Flow data
    if (await knex.schema.hasTable('approval_flows')) {
        await knex.schema.table('approval_flows', (table) => {
            table.specificType('visual_config', 'LONGTEXT');
        });
    }

    // Add flow_id to document_approvals to link with the template
    if (await knex.schema.hasTable('document_approvals')) {
        await knex.schema.table('document_approvals', (table) => {
            table.integer('flow_id').unsigned();
        });
    }

    // Add node_id to approval_steps to track position in the graph
    if (await knex.schema.hasTable('approval_steps')) {
        await knex.schema.table('approval_steps', (table) => {
            table.string('node_id', 100);
        });
    }
};

export const down = async (knex) => {
    if (await knex.schema.hasTable('approval_flows')) {
        await knex.schema.table('approval_flows', (table) => {
            table.dropColumn('visual_config');
        });
    }

    if (await knex.schema.hasTable('document_approvals')) {
        await knex.schema.table('document_approvals', (table) => {
            table.dropColumn('flow_id');
        });
    }

    if (await knex.schema.hasTable('approval_steps')) {
        await knex.schema.table('approval_steps', (table) => {
            table.dropColumn('node_id');
        });
    }
};
