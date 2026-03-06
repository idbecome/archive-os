import Knex from 'knex';
import knexConfig from './knexfile.js';

const knex = Knex(knexConfig.development);

async function check() {
    try {
        const tables = await knex.raw('SHOW TABLES');
        const tableNames = tables[0].map(row => Object.values(row)[0]);
        console.log('Tables:', tableNames.join(', '));

        const hasComments = tableNames.includes('comments');
        const hasDocComments = tableNames.includes('document_comments');

        console.log('has comments:', hasComments);
        console.log('has document_comments:', hasDocComments);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
