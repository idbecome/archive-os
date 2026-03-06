export const up = function (knex) {
    return knex.schema.hasTable('job_queue').then(exists => {
        if (exists) {
            return knex.schema.alterTable('job_queue', table => {
                table.integer('retries').defaultTo(0);
                table.integer('max_attempts').defaultTo(3);
            });
        }
    });
};

export const down = function (knex) {
    return knex.schema.hasTable('job_queue').then(exists => {
        if (exists) {
            return knex.schema.alterTable('job_queue', table => {
                table.dropColumns('retries', 'max_attempts');
            });
        }
    });
};
