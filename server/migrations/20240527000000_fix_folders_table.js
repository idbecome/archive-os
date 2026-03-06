/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function (knex) {
  const hasTable = await knex.schema.hasTable('folders');

  if (!hasTable) {
    return knex.schema.createTable('folders', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.integer('parentId').unsigned().nullable();
      table.string('privacy').defaultTo('public');
      table.string('owner').nullable();
      table.text('allowedDepts', 'longtext').nullable();
      table.text('allowedUsers', 'longtext').nullable();
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());
    });
  } else {
    const hasCreatedAt = await knex.schema.hasColumn('folders', 'createdAt');
    const hasUpdatedAt = await knex.schema.hasColumn('folders', 'updatedAt');

    return knex.schema.alterTable('folders', (table) => {
      if (!hasCreatedAt) {
        table.timestamp('createdAt').defaultTo(knex.fn.now()).after('allowedUsers');
      }
      if (!hasUpdatedAt) {
        table.timestamp('updatedAt').defaultTo(knex.fn.now()).after('createdAt');
      }
    });
  }
};

export const down = async function (knex) {
  if (await knex.schema.hasTable('folders')) {
    return knex.schema.alterTable('folders', table => {
      table.dropColumn('createdAt');
      table.dropColumn('updatedAt');
    });
  }
};