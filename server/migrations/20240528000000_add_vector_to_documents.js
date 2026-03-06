/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
    const tables = ['documents', 'invoices'];
    
    for (const tableName of tables) {
        const hasTable = await knex.schema.hasTable(tableName);
        if (hasTable) {
            const hasColumn = await knex.schema.hasColumn(tableName, 'vector');
            if (!hasColumn) {
                await knex.schema.alterTable(tableName, (table) => {
                    // Menggunakan text untuk menyimpan JSON embedding AI
                    table.text('vector'); 
                });
            }
        }
    }
}

/**
 * @param { import("knex").Knex } knex
 */
export async function down(knex) {
    try {
        const tables = ['documents', 'invoices'];
        for (const tableName of tables) {
            const hasTable = await knex.schema.hasTable(tableName);
            if (hasTable) {
                const hasColumn = await knex.schema.hasColumn(tableName, 'vector');
                if (hasColumn) {
                    await knex.schema.alterTable(tableName, (table) => {
                        table.dropColumn('vector');
                    });
                }
            }
        }
    } catch (err) {
        // Abaikan error jika tabel tidak ditemukan saat rollback (Self-Healing)
        if (err.code === 'ER_BAD_TABLE_ERROR' || err.errno === 1051 || err.message.includes("doesn't exist")) {
            return;
        }
        throw err;
    }
}
