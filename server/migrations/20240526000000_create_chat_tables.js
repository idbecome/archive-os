/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  // 1. Tabel untuk Komentar Dokumen (Chat pada file)
  const hasComments = await knex.schema.hasTable('comments');
  if (!hasComments) {
    await knex.schema.createTable('comments', table => {
      table.string('id').primary();
      table.string('documentId').notNullable();
      table.string('user').notNullable();
      table.text('text').notNullable();
      table.timestamp('timestamp').defaultTo(knex.fn.now());
      table.string('attachment').nullable();
      table.string('attachment_name').nullable();
      table.string('attachment_type').nullable();
    });
  } else {
    const hasAttachment = await knex.schema.hasColumn('comments', 'attachment');
    const hasDocId = await knex.schema.hasColumn('comments', 'documentId');
    const hasAttachName = await knex.schema.hasColumn('comments', 'attachment_name');
    const hasAttachType = await knex.schema.hasColumn('comments', 'attachment_type');
    
    await knex.schema.alterTable('comments', table => {
      if (!hasAttachment) table.string('attachment').nullable();
      if (!hasDocId) table.string('documentId').notNullable();
      if (!hasAttachName) table.string('attachment_name').nullable();
      if (!hasAttachType) table.string('attachment_type').nullable();
    });
  }

  // 2. Tabel untuk Catatan Audit (Chat pada Monitoring Pajak)
  const hasTaxAuditNotes = await knex.schema.hasTable('tax_audit_notes');
  if (!hasTaxAuditNotes) {
    await knex.schema.createTable('tax_audit_notes', table => {
      table.increments('id').primary(); // FIX: Backend tidak kirim ID, gunakan Auto-Increment
      table.string('auditId').notNullable(); // Sesuaikan camelCase
      table.integer('stepIndex').notNullable(); // Sesuaikan camelCase
      table.string('user').notNullable();
      table.text('text').notNullable();
      table.timestamp('timestamp').defaultTo(knex.fn.now());
      table.string('attachmentName').nullable();
      table.string('attachmentUrl').nullable();
      table.string('attachmentType').nullable();
      table.string('attachmentSize').nullable();
    });
  } else {
    // Self-Healing: Tambahkan kolom jika tabel sudah ada tapi kolom kurang/salah nama
    const hasAttachmentName = await knex.schema.hasColumn('tax_audit_notes', 'attachmentName');
    if (!hasAttachmentName) {
      await knex.schema.alterTable('tax_audit_notes', table => {
        table.string('attachmentName').nullable();
        table.string('attachmentUrl').nullable();
        table.string('attachmentType').nullable();
        table.string('attachmentSize').nullable();
      });
    }
  }
};

export const down = async function(knex) {
  await knex.schema.dropTableIfExists('comments');
  await knex.schema.dropTableIfExists('tax_audit_notes');
};