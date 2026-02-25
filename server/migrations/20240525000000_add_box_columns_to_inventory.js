/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function (knex) {
  const hasBoxId = await knex.schema.hasColumn('inventory', 'box_id');
  const hasBoxData = await knex.schema.hasColumn('inventory', 'box_data');

  return knex.schema.alterTable('inventory', (table) => {
    if (!hasBoxId) {
      table.string('box_id').nullable().after('status');
    }
    if (!hasBoxData) {
      table.text('box_data', 'longtext').nullable().after('box_id');
    }
  });
};

export const down = async function (knex) {
  if (await knex.schema.hasTable('inventory')) {
    return knex.schema.alterTable('inventory', table => {
      table.dropColumn('box_id');
      table.dropColumn('box_data');
    });
  }
};