/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  const hasTable = await knex.schema.hasTable('job_queue');
  if (hasTable) {
    const hasError = await knex.schema.hasColumn('job_queue', 'error');
    const hasErrorLog = await knex.schema.hasColumn('job_queue', 'error_log');
    const hasStatus = await knex.schema.hasColumn('job_queue', 'status');
    const hasProgress = await knex.schema.hasColumn('job_queue', 'progress');

    await knex.schema.alterTable('job_queue', table => {
      if (!hasErrorLog) {
        table.text('error_log').nullable();
      }
      // Tambahkan status untuk mendukung antrean (waiting, active, completed, failed)
      if (!hasStatus) table.string('status').defaultTo('waiting');
      // Tambahkan progress untuk tracking persentase
      if (!hasProgress) table.integer('progress').defaultTo(0);
    });

    // Data Migration: Salin data dari 'error' ke 'error_log' jika 'error_log' baru dibuat
    if (hasError && !hasErrorLog) {
      await knex('job_queue')
        .whereNotNull('error')
        .update({
          error_log: knex.ref('error')
        });
    }
  }
};

export const down = async function(knex) {
  const hasTable = await knex.schema.hasTable('job_queue');
  if (hasTable) {
    const hasErrorLog = await knex.schema.hasColumn('job_queue', 'error_log');
    if (hasErrorLog) {
      await knex.schema.alterTable('job_queue', table => {
        table.dropColumn('error_log');
      });
    }
  }
};