import { parseIntent, generateEmbedding } from './server/ai_search.js';

async function run() {
    console.log('--- Testing Comparison Query ---');
    const query = "Bandingkan PPH Januari dan Februari 2024";
    const vector = await generateEmbedding(query);
    const intent = await parseIntent(query, vector);
    console.log('Intent Result:', JSON.stringify(intent, null, 2));

    console.log('\n--- Testing Audit Query ---');
    const query2 = "Status pemeriksaan";
    const vector2 = await generateEmbedding(query2);
    const intent2 = await parseIntent(query2, vector2);
    console.log('Intent Result:', JSON.stringify(intent2, null, 2));

    process.exit(0);
}

run();
