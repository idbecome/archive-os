
export const up = async (knex) => {
    // Helper function to safely add columns
    const addColumnIfNotExists = async (tableName, columnName, callback) => {
        const hasTable = await knex.schema.hasTable(tableName);
        if (hasTable) {
            const hasColumn = await knex.schema.hasColumn(tableName, columnName);
            if (!hasColumn) {
                await knex.schema.alterTable(tableName, callback);
                console.log(`Column ${columnName} added to ${tableName}`);
            }
        }
    };

    // Add to invoices table
    await addColumnIfNotExists('invoices', 'tax_invoice_no', (table) => {
        table.string('tax_invoice_no', 100).nullable();
    });
    await addColumnIfNotExists('invoices', 'special_note', (table) => {
        table.text('special_note').nullable();
    });

    // Add to inventory_items table (consistency)
    await addColumnIfNotExists('inventory_items', 'tax_invoice_no', (table) => {
        table.string('tax_invoice_no', 100).nullable();
    });
    await addColumnIfNotExists('inventory_items', 'special_note', (table) => {
        table.text('special_note').nullable();
    });
};

export const down = async (knex) => {
    await knex.schema.alterTable('invoices', (table) => {
        table.dropColumn('tax_invoice_no');
        table.dropColumn('special_note');
    });
    await knex.schema.alterTable('inventory_items', (table) => {
        table.dropColumn('tax_invoice_no');
        table.dropColumn('special_note');
    });
};
