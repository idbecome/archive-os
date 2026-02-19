import { knex } from '../db.js';
import {
    generateEmbedding,
    cosineSimilarity,
    parseIntent,
    generateAnswer
} from '../ai_search.js'; // Keep this service as is for now

export const searchDocuments = async (req, res) => {
    try {
        const { q, type } = req.query; // type: 'keyword', 'semantic'

        if (type === 'semantic') {
            const queryVector = await generateEmbedding(q);
            // Get all docs with embeddings (mocking vector search for now or use pgvector if available)
            // For now, we fetch recent docs and re-rank (naive approach for MVP)
            const docs = await knex('documents').select('*').limit(100);

            // In a real pgvector setup, we'd do: ORDER BY embedding <=> queryVector
            // Here we just return keyword match as fallback or basic implementation
            const results = docs.filter(d => {
                return d.title.toLowerCase().includes(q.toLowerCase()) ||
                    (d.ocrContent || '').toLowerCase().includes(q.toLowerCase());
            });
            return res.json(results);
        }

        // Keyword search
        const docs = await knex('documents')
            .where('title', 'like', `%${q}%`)
            .orWhere('ocrContent', 'like', `%${q}%`);
        res.json(docs);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const chatWithAI = async (req, res) => {
    try {
        const { message, history } = req.body;
        // Handle case where message might be undefined if called incorrectly
        const text = message || req.body.query;
        if (!text) return res.status(400).json({ error: "Message or query required" });

        const queryVector = await generateEmbedding(text);
        const intent = await parseIntent(text, queryVector);

        let contextData = [];
        let answer = "";

        // logic based on intent... (simplified for brevity, pulling from original index.js logic)
        if (intent.type === 'tax_lookup') {
            const taxObjects = await knex('master_tax_objects').select('*');
            // naive implementation
            contextData = taxObjects.map(t => `${t.name}: ${t.description} (${t.rate}%)`);
            answer = await generateAnswer(text, contextData);
        } else {
            // Default RAG
            const docs = await knex('documents').orderBy('uploadDate', 'desc').limit(5);
            contextData = docs.map(d => `Doc: ${d.title} Content: ${(d.ocrContent || '').substring(0, 200)}...`);
            answer = await generateAnswer(text, contextData);
        }

        res.json({
            reply: answer,
            intent: intent.type,
            context: contextData.slice(0, 3)
        });

    } catch (err) {
        console.error("AI Error:", err);
        res.status(500).json({ error: "AI Service Error" });
    }
};

export const semanticSearch = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: "Query required" });

        const queryVector = await generateEmbedding(query);
        const intent = await parseIntent(query, queryVector);

        // Mock Search: In real app, use vector similarity on DB. 
        // Here we just fetch docs and filter loosely for demo + basic keyword match
        const docs = await knex('documents').select('*').limit(50);

        const results = docs
            .filter(d => {
                const titleMatch = d.title.toLowerCase().includes(query.toLowerCase());
                const contentMatch = (d.ocrContent || '').toLowerCase().includes(query.toLowerCase());
                return titleMatch || contentMatch;
            })
            .map(d => ({
                id: d.id,
                name: d.title,
                date: d.uploadDate,
                size: d.size,
                matchType: d.category === 'invoice' ? 'invoice' : 'document', // Basic mapping
                score: 0.85, // Mock score
                data: d
            }));

        res.json({ results });
    } catch (err) {
        console.error("Semantic Search Error:", err);
        res.status(500).json({ error: err.message });
    }
};
