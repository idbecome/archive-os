/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  const hasTable = await knex.schema.hasTable('users');
  
  if (!hasTable) {
    // Jika tabel belum ada, buat baru dengan constraint unik
    await knex.schema.createTable('users', table => {
      table.increments('id').primary();
      table.string('username').notNullable().unique();
      table.string('password').notNullable();
      table.string('name').nullable();
      table.string('role').defaultTo('staff');
      table.string('department').nullable();
      table.timestamps(true, true);
    });
  } else {
    // Self-Healing: Jika tabel sudah ada, cek kolom yang mungkin belum ada
    const hasUsername = await knex.schema.hasColumn('users', 'username');
    const hasRole = await knex.schema.hasColumn('users', 'role');
    const hasDept = await knex.schema.hasColumn('users', 'department');

    await knex.schema.alterTable('users', table => {
      if (!hasUsername) {
        table.string('username').notNullable();
      }
      if (!hasRole) table.string('role').defaultTo('staff');
      if (!hasDept) table.string('department').nullable();
    });

    // Tambahkan unique constraint secara terpisah dengan pengecekan manual untuk menghindari error "Duplicate key"
    if (!hasUsername) {
      try {
        // Cara yang lebih aman untuk mengecek keberadaan index unik
        const result = await knex.raw(`SHOW INDEX FROM users WHERE Column_name = 'username' AND Non_unique = 0`);
        const indexExists = result[0] && result[0].length > 0;
        
        if (!indexExists) {
          await knex.schema.alterTable('users', table => {
            table.unique('username');
          });
        }
      } catch (e) {
        console.warn("Skipping unique constraint creation for users.username (might already exist)");
      }
    }
  }
};

export const down = async function(knex) {
  await knex.schema.dropTableIfExists('users');
};