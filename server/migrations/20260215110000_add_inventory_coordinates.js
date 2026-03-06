
export const up = async (knex) => {
    // Check if column already exists to avoid duplicate error
    const hasRack = await knex.schema.hasColumn('inventory', 'rack');
    if (!hasRack) {
        await knex.schema.table('inventory', (table) => {
            table.string('rack', 10);      // e.g., 'A', 'B'
            table.integer('shelf');        // e.g., 1, 2, 3
            table.integer('position');     // e.g., 1, 2 (Left/Right)
        });
    } else {
        console.log("Skipping add columns: rack/shelf/position already exist.");
    }

    // Optional: Seed default coordinates for existing 100 items
    // Simple layout: 5 Racks (A-E), each has 5 Shelves, each shelf has 4 Positions = 100 items
    const rows = await knex('inventory').select('id').orderBy('id');
    const racks = ['A', 'B', 'C', 'D', 'E'];

    for (let i = 0; i < rows.length; i++) {
        const id = rows[i].id;
        // logic to map ID 1-100 to A1-1 ... E5-4
        // index 0-99
        // Rack index = floor(i / 20) -> 0-4 (A-E)
        // Remainder = i % 20 (0-19)
        // Shelf = floor(remainder / 4) + 1 -> 1-5
        // Position = (remainder % 4) + 1 -> 1-4

        const rackIdx = Math.floor(i / 20);
        const rack = racks[rackIdx] || 'Z'; // Fallback Z
        const remainder = i % 20;
        const shelf = Math.floor(remainder / 4) + 1;
        const position = (remainder % 4) + 1;

        await knex('inventory')
            .where('id', id)
            .update({ rack, shelf, position });
    }
};

export const down = async (knex) => {
    console.warn('⚠️  [MIGRATION DOWN] add_inventory_coordinates: Removing rack/shelf/position');
    if (await knex.schema.hasTable('inventory')) {
        const cols = ['rack', 'shelf', 'position'];
        for (const col of cols) {
            if (await knex.schema.hasColumn('inventory', col)) {
                await knex.schema.table('inventory', (table) => {
                    table.dropColumn(col);
                });
            }
        }
    }
};
