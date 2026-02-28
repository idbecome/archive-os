export const up = async (knex) => {
    // Ensure 'comments' table has an 'attachment' column for JSON
    const hasComments = await knex.schema.hasTable('comments');

    if (hasComments) {
        const hasAttachment = await knex.schema.hasColumn('comments', 'attachment');
        if (!hasAttachment) {
            await knex.schema.table('comments', (table) => {
                table.text('attachment'); // storing JSON string
            });
            console.log("  ✅ Added 'attachment' column to comments table.");
        } else {
            console.log("  ⏭️  'attachment' column already exists in comments table.");
        }
    }
};


export const down = async (knex) => {
    // No-op for this revert, as dropping the JSON attachment column 
    // might destroy data if we depend on it later, but for strictness:
    const hasComments = await knex.schema.hasTable('comments');
    if (hasComments) {
        const hasAttachment = await knex.schema.hasColumn('comments', 'attachment');
        if (hasAttachment) {
            await knex.schema.table('comments', (table) => {
                table.dropColumn('attachment');
            });
        }
    }
};
