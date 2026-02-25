import { knex } from '../db.js';
import logger from './logger.js';

export const syncDatabaseSchema = async () => {
    try {
        const tableName = 'pustaka_slides';
        const columnName = 'image';

        const hasColumn = await knex.schema.hasColumn(tableName, columnName);
        
        if (!hasColumn) {
            logger.info(`Migrating: Adding column "${columnName}" to "${tableName}"`);
            await knex.schema.table(tableName, (table) => {
                table.string(columnName, 255).nullable().after('guide_id');
            });
            logger.info(`Migration successful: Column "${columnName}" added.`);
        }
    } catch (error) {
        logger.error('Database Auto-Migration Failed', { error: error.message });
    }
};