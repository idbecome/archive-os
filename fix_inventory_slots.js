import { knex } from './server/db.js';

async function fixInventory() {
    console.log("Checking inventory table slots...");
    const TOTAL_SLOTS = 100;

    try {
        const [{ count }] = await knex('inventory').count('id as count');
        console.log(`Current slot count: ${count}`);

        if (count < TOTAL_SLOTS) {
            console.log(`Adding missing slots up to ${TOTAL_SLOTS}...`);
            const existingIds = (await knex('inventory').select('id')).map(r => r.id);
            const missingSlots = [];

            for (let i = 1; i <= TOTAL_SLOTS; i++) {
                if (!existingIds.includes(i)) {
                    missingSlots.push({
                        id: i,
                        status: 'EMPTY',
                        history: JSON.stringify([]),
                        lastUpdated: null,
                        box_data: null
                    });
                }
            }

            if (missingSlots.length > 0) {
                // Batch insert to avoid issues
                const batchSize = 25;
                for (let i = 0; i < missingSlots.length; i += batchSize) {
                    const batch = missingSlots.slice(i, i + batchSize);
                    await knex('inventory').insert(batch);
                    console.log(`Inserted batch of ${batch.length} slots...`);
                }
                console.log(`Successfully added ${missingSlots.length} missing slots.`);
            }
        } else {
            console.log("Inventory table already has 100 or more slots.");
        }
    } catch (error) {
        console.error("Error fixing inventory slots:", error);
    } finally {
        process.exit(0);
    }
}

fixInventory();
