export const up = async (knex) => {
    // Check if 'comments' exists and rename it, or create 'document_comments'
    const hasComments = await knex.schema.hasTable('comments');
    const hasDocComments = await knex.schema.hasTable('document_comments');

    if (hasComments && !hasDocComments) {
        await knex.schema.renameTable('comments', 'document_comments');
    } else if (!hasDocComments) {
        await knex.schema.createTable('document_comments', (table) => {
            table.string('id').primary();
            table.string('documentId');
            table.string('user', 100);
            table.text('text');
            table.dateTime('timestamp').defaultTo(knex.fn.now());
            table.text('attachment'); // storing JSON string
        });
    }
};

export const down = async (knex) => {
    await knex.schema.renameTable('document_comments', 'comments');
};
