export const up = async (knex) => {
    // 1. Add 'attachment' column if it doesn't exist
    const hasAttachment = await knex.schema.hasColumn('document_comments', 'attachment');
    if (!hasAttachment) {
        await knex.schema.table('document_comments', (table) => {
            table.text('attachment').nullable();
        });
    }

    // 2. Migrate existing data from separate columns to JSON string in 'attachment'
    // check if old columns exist before trying to read them
    const hasOldUrl = await knex.schema.hasColumn('document_comments', 'attachmentUrl');
    if (hasOldUrl) {
        const rows = await knex('document_comments').select('*');
        for (const row of rows) {
            // Only migrate if attachment is empty and we have old data
            if (!row.attachment && row.attachmentUrl) {
                const attachment = JSON.stringify({
                    name: row.attachmentName || 'Attachment',
                    url: row.attachmentUrl,
                    type: row.attachmentType || 'application/octet-stream',
                    size: row.attachmentSize || ''
                });
                await knex('document_comments')
                    .where('id', row.id)
                    .update({ attachment });
            }
        }
    }

    // 3. Fix ID type
    const columnInfo = await knex('document_comments').columnInfo('id');
    if (columnInfo.type !== 'varchar' && columnInfo.type !== 'string') {
        console.log('Converting ID to VARCHAR(50)...');
        await knex.raw('ALTER TABLE document_comments MODIFY id VARCHAR(50) NOT NULL');
    }

    // 4. Drop old columns if they exist
    await knex.schema.table('document_comments', (table) => {
        if (hasOldUrl) table.dropColumn('attachmentUrl');
    });
    const hasOldName = await knex.schema.hasColumn('document_comments', 'attachmentName');
    if (hasOldName) {
        await knex.schema.table('document_comments', (table) => {
            table.dropColumn('attachmentName');
        });
    }
    const hasOldType = await knex.schema.hasColumn('document_comments', 'attachmentType');
    if (hasOldType) {
        await knex.schema.table('document_comments', (table) => {
            table.dropColumn('attachmentType');
        });
    }
    const hasOldSize = await knex.schema.hasColumn('document_comments', 'attachmentSize');
    if (hasOldSize) {
        await knex.schema.table('document_comments', (table) => {
            table.dropColumn('attachmentSize');
        });
    }
};

export const down = async (knex) => {
    // Restore logic would need adjustment too, but keeping it simple for now
    await knex.schema.table('document_comments', (table) => {
        table.text('attachmentUrl').nullable();
        table.text('attachmentName').nullable();
        table.string('attachmentType', 100).nullable();
        table.string('attachmentSize', 50).nullable();
    });

    const rows = await knex('document_comments').select('*');
    for (const row of rows) {
        if (row.attachment) {
            try {
                const data = JSON.parse(row.attachment);
                await knex('document_comments').where('id', row.id).update({
                    attachmentUrl: data.url,
                    attachmentName: data.name,
                    attachmentType: data.type,
                    attachmentSize: data.size
                });
            } catch (e) { }
        }
    }

    await knex.schema.table('document_comments', (table) => {
        table.dropColumn('attachment');
    });
};
