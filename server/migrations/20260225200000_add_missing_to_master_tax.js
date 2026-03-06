
export const up = async (knex) => {
    console.log("Running migration: add_missing_to_master_tax UP");
    const tableExists = await knex.schema.hasTable('master_tax_objects');
    console.log("Table master_tax_objects exists:", tableExists);
    if (tableExists) {
        if (!(await knex.schema.hasColumn('master_tax_objects', 'is_pph21_bukan_pegawai'))) {
            console.log("Adding column: is_pph21_bukan_pegawai");
            await knex.schema.alterTable('master_tax_objects', (table) => {
                table.boolean('is_pph21_bukan_pegawai').defaultTo(false);
            });
        }
        if (!(await knex.schema.hasColumn('master_tax_objects', 'use_ppn'))) {
            console.log("Adding column: use_ppn");
            await knex.schema.alterTable('master_tax_objects', (table) => {
                table.boolean('use_ppn').defaultTo(true);
            });
        }
        if (!(await knex.schema.hasColumn('master_tax_objects', 'markup_mode'))) {
            console.log("Adding column: markup_mode");
            await knex.schema.alterTable('master_tax_objects', (table) => {
                table.string('markup_mode').defaultTo('none');
            });
        }
    } else {
        console.error("CRITICAL: table master_tax_objects NOT FOUND during migration!");
    }
};

export const down = async (knex) => {
    console.warn('⚠️  [MIGRATION DOWN] add_missing_to_master_tax: Removing tax columns');
    if (await knex.schema.hasTable('master_tax_objects')) {
        const cols = ['is_pph21_bukan_pegawai', 'use_ppn', 'markup_mode'];
        for (const col of cols) {
            if (await knex.schema.hasColumn('master_tax_objects', col)) {
                await knex.schema.alterTable('master_tax_objects', (table) => {
                    table.dropColumn(col);
                });
            }
        }
    }
};
