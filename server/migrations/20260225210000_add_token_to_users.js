
export const up = async (knex) => {
    if (await knex.schema.hasTable('users')) {
        if (!(await knex.schema.hasColumn('users', 'token'))) {
            await knex.schema.alterTable('users', (table) => {
                table.string('token').nullable();
            });
        }
    }
};

export const down = async (knex) => {
    if (await knex.schema.hasTable('users')) {
        await knex.schema.alterTable('users', (table) => {
            table.dropColumn('token');
        });
    }
};
