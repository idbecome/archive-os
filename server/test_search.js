
import db from './db.js';
import { getEmbedding, cosineSimilarity } from './semantic.js';

async function testSearch(query) {
    console.log(`Testing search for: "${query}"`);

    try {
        const queryVector = await getEmbedding(query);
        if (!queryVector) {
            console.error("Failed to generate query vector.");
            return;
        }

        db.all("SELECT id, title, vector FROM documents WHERE vector IS NOT NULL", [], (err, rows) => {
            if (err) {
                console.error("DB Error:", err);
                return;
            }

            console.log(`Scanning ${rows.length} documents with vectors...`);

            const results = rows.map(doc => {
                try {
                    const docVector = JSON.parse(doc.vector);
                    const score = cosineSimilarity(queryVector, docVector);
                    return { title: doc.title, score };
                } catch (e) {
                    return { title: doc.title, score: 0, error: e.message };
                }
            })
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);

            console.log("Top 5 Results:");
            results.forEach(r => console.log(`${r.score.toFixed(4)} - ${r.title}`));
        });
    } catch (e) {
        console.error("Test failed:", e);
    }
}

// Run test
setTimeout(() => testSearch("Tagihan"), 2000);
