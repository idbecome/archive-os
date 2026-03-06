/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.alterTable('pustaka_slides', table => {
    table.string('image', 255).nullable().after('guide_id');
  });
};

export const down = function(knex) {
  return knex.schema.alterTable('pustaka_slides', table => {
    table.dropColumn('image');
  });
};