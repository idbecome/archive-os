/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  // 1. Tabel untuk Jadwal (Jobs)
  if (!(await knex.schema.hasTable('job_due_dates'))) {
    await knex.schema.createTable('job_due_dates', table => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.string('due_date').nullable();
      table.string('assigned_to').notNullable();
      table.string('privacy').defaultTo('public');
      table.text('allowed_users').nullable(); // Disimpan sebagai JSON string
      table.text('allowed_depts').nullable(); // Disimpan sebagai JSON string
      table.string('type').defaultTo('special'); // 'recurring' atau 'special'
      table.string('target_dept').nullable();
      table.string('owner').notNullable();
      table.string('status').defaultTo('pending');
      table.timestamp('completed_at').nullable();
      table.text('issues').nullable(); // Disimpan sebagai JSON string (array of objects)
      table.text('kendala').nullable();
      table.timestamps(true, true);
    });
  }

  // 2. Tabel untuk Daftar PIC yang Dimonitor (Dashboard Blocks)
  if (!(await knex.schema.hasTable('monitored_pics'))) {
    await knex.schema.createTable('monitored_pics', table => {
      table.increments('id').primary();
      table.string('username').notNullable();
      table.string('privacy').defaultTo('public');
      table.text('allowed_users').nullable(); // JSON string
      table.text('allowed_depts').nullable(); // JSON string
      table.timestamps(true, true);
      table.unique(['username']); // Satu blok per user
    });
  }

  // 3. Tabel untuk Issue Mandiri (Independent Issues)
  if (!(await knex.schema.hasTable('independent_issues'))) {
    await knex.schema.createTable('independent_issues', table => {
      table.increments('id').primary();
      table.string('note').notNullable();
      table.text('detail').nullable();
      table.string('status').defaultTo('pending');
      table.integer('progress').defaultTo(0);
      table.text('history').nullable(); // JSON string (array of status updates)
      table.string('assigned_to').notNullable();
      table.timestamp('resolved_at').nullable();
      table.timestamps(true, true);
    });
  }
};

export const down = async function(knex) {
  await knex.schema.dropTableIfExists('independent_issues');
  await knex.schema.dropTableIfExists('monitored_pics');
  await knex.schema.dropTableIfExists('job_due_dates');
};