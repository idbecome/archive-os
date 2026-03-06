
export const up = async function (knex) {
    const hasAuditor = await knex.schema.hasColumn('tax_audits', 'auditor');
    if (!hasAuditor) {
        await knex.schema.alterTable('tax_audits', (table) => {
            table.string('auditor').nullable();
        });
    }
};

export const down = async function (knex) {
    if (await knex.schema.hasTable('tax_audits')) {
        const hasAuditor = await knex.schema.hasColumn('tax_audits', 'auditor');
        if (hasAuditor) {
            await knex.schema.alterTable('tax_audits', (table) => {
                table.dropColumn('auditor');
            });
        }
    }
};
