/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function (knex) {
  const hasColumn = await knex.schema.hasColumn('pustaka_slides', 'image');
  if (!hasColumn) {
    return knex.schema.alterTable('pustaka_slides', table => {
      table.string('image', 255).nullable().after('guide_id');
    });
  }
};

export const down = async function (knex) {
  if (await knex.schema.hasTable('pustaka_slides')) {
    return knex.schema.alterTable('pustaka_slides', table => {
      table.dropColumn('image');
    });
  }
};