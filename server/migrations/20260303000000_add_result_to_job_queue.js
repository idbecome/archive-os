/**
 * Migration: add `result` column to `job_queue` for storing job outputs (JSON/text)
 */
export const up = async function(knex) {
  const has = await knex.schema.hasTable('job_queue');
  if (!has) return;
  const hasCol = await knex.schema.hasColumn('job_queue', 'result');
  if (!hasCol) {
    await knex.schema.alterTable('job_queue', table => {
      table.text('result').nullable();
    });
    console.log('Migration: added job_queue.result column');
  }
};

export const down = async function(knex) {
  const has = await knex.schema.hasTable('job_queue');
  if (!has) return;
  const hasCol = await knex.schema.hasColumn('job_queue', 'result');
  if (hasCol) {
    await knex.schema.alterTable('job_queue', table => {
      table.dropColumn('result');
    });
    console.log('Migration: dropped job_queue.result column');
  }
};
