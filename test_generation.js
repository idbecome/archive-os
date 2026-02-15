
import { generateAnswer } from './server/ai_search.js';

async function testGen() {
    try {
        console.log("Testing generation...");
        const answer = await generateAnswer("Apa isi dokumen?", ["Konsep surat penawaran harga untuk klien baru."]);
        console.log("Result:", answer);
    } catch (e) {
        console.error("Test Failed:", e);
    }
}

testGen();
