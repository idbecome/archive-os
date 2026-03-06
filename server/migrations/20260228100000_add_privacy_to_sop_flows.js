
export const up = async (knex) => {
    // Helper function to safely add columns
    const addColumnIfNotExists = async (tableName, columnName, callback) => {
        const hasTable = await knex.schema.hasTable(tableName);
        if (hasTable) {
            const hasColumn = await knex.schema.hasColumn(tableName, columnName);
            if (!hasColumn) {
                await knex.schema.alterTable(tableName, callback);
                console.log(`  ✅ Column ${columnName} added to ${tableName}`);
            } else {
                console.log(`  ⏭️  Column ${columnName} already exists in ${tableName}`);
            }
        }
    };

    console.log('[MIGRATION] add_privacy_to_sop_flows UP');

    await addColumnIfNotExists('sop_flows', 'privacy_type', (table) => {
        table.string('privacy_type', 50).defaultTo('public');
    });

    await addColumnIfNotExists('sop_flows', 'allowed_departments', (table) => {
        table.text('allowed_departments').nullable();
    });

    await addColumnIfNotExists('sop_flows', 'allowed_users', (table) => {
        table.text('allowed_users').nullable();
    });
};

export const down = async (knex) => {
    const hasTable = await knex.schema.hasTable('sop_flows');
    if (hasTable) {
        await knex.schema.alterTable('sop_flows', (table) => {
            table.dropColumn('privacy_type');
            table.dropColumn('allowed_departments');
            table.dropColumn('allowed_users');
        });
    }
};
