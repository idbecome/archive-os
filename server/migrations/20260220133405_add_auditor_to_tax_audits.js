
export const up = async function (knex) {
    await knex.schema.alterTable('tax_audits', (table) => {
        table.string('auditor').nullable();
    });
};

export const down = async function (knex) {
    await knex.schema.alterTable('tax_audits', (table) => {
        table.dropColumn('auditor');
    });
};
