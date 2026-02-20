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
        let rawSummaries = [];

        // logic based on intent... (simplified for brevity, pulling from original index.js logic)
        if (intent.type === 'tax_lookup') {
            const taxObjects = await knex('master_tax_objects').select('*');
            rawSummaries = taxObjects;
            contextData = taxObjects.map(t => `${t.name}: ${t.description} (${t.rate}%)`);
            answer = await generateAnswer(text, contextData);
        } else if (['aggregation', 'comparison', 'over_under_payment'].includes(intent.type)) {
            // Fetch relevant tax summaries
            let queryBuilder = knex('tax_summaries');
            if (intent.taxType) queryBuilder = queryBuilder.where('type', intent.taxType);
            if (intent.year) queryBuilder = queryBuilder.where('year', intent.year);
            // If it's a comparison, we might need all years/months
            if (intent.type === 'comparison') {
                if (intent.years.length > 0) queryBuilder = queryBuilder.whereIn('year', intent.years);
            }

            rawSummaries = await queryBuilder.select('*');
            const summaries = rawSummaries.map(s => ({
                ...s,
                data: typeof s.data === 'string' ? JSON.parse(s.data) : (s.data || {})
            }));

            // Format context based on intent
            if (intent.type === 'aggregation') {
                contextData = summaries.map(s => {
                    let detail = '';
                    if (s.type === 'PPH') {
                        const total = Object.values(s.data.pph || {}).reduce((a, b) => a + b, 0);
                        detail = `Total PPH: Rp ${total.toLocaleString()}`;
                    } else {
                        const inTotal = Object.values(s.data.ppnIn || {}).reduce((a, b) => a + b, 0);
                        const outTotal = Object.values(s.data.ppnOut || {}).reduce((a, b) => a + b, 0);
                        detail = `PPN Masukan: Rp ${inTotal.toLocaleString()}, PPN Keluaran: Rp ${outTotal.toLocaleString()}, Net: Rp ${(outTotal - inTotal).toLocaleString()}`;
                    }
                    return `${s.month} ${s.year} (${s.type}) -> ${detail}`;
                });
            } else if (intent.type === 'over_under_payment') {
                contextData = summaries
                    .filter(s => s.type === 'PPN')
                    .map(s => {
                        const inTotal = Object.values(s.data.ppnIn || {}).reduce((a, b) => a + b, 0);
                        const outTotal = Object.values(s.data.ppnOut || {}).reduce((a, b) => a + b, 0);
                        const net = outTotal - inTotal;
                        const status = net > 0 ? "Kurang Bayar (KB)" : (net < 0 ? "Lebih Bayar (LB)" : "Nihil");
                        return `${s.month} ${s.year}: ${status} sebesar Rp ${Math.abs(net).toLocaleString()}`;
                    });
            } else if (intent.type === 'comparison') {
                contextData = summaries.map(s => {
                    const label = `${s.month} ${s.year} (${s.type})`;
                    if (s.type === 'PPH') {
                        const items = Object.entries(s.data.pph || {}).map(([k, v]) => `${k}: ${v}`).join(", ");
                        return `${label}: ${items}`;
                    } else {
                        const inT = Object.values(s.data.ppnIn || {}).reduce((a, b) => a + b, 0);
                        const outT = Object.values(s.data.ppnOut || {}).reduce((a, b) => a + b, 0);
                        return `${label}: In=Rp ${inT.toLocaleString()}, Out=Rp ${outT.toLocaleString()}, Net=Rp ${(outT - inT).toLocaleString()}`;
                    }
                });
            }

            if (contextData.length === 0) {
                answer = "Maaf, saya tidak menemukan data pajak yang sesuai dengan kriteria tersebut di basis data.";
            } else {
                answer = await generateAnswer(text, contextData);
            }
        } else {
            // Default RAG
            const docs = await knex('documents').orderBy('uploadDate', 'desc').limit(5);
            rawSummaries = docs; // Use docs as results for consistency
            contextData = docs.map(d => `Doc: ${d.title} Content: ${(d.ocrContent || '').substring(0, 200)}...`);
            answer = await generateAnswer(text, contextData);
        }

        res.json({
            reply: answer,
            intent: intent.type,
            context: contextData.slice(0, 3),
            results: rawSummaries.map(s => {
                const isTaxSummary = !!s.type; // Tax summaries have a 'type' field (PPN/PPH)
                return {
                    id: s.id,
                    title: s.title || `${s.month} ${s.year} (${s.type})`,
                    type: isTaxSummary ? 'tax_summary' : (s.category || 'document'),
                    matchType: isTaxSummary ? 'tax_summary' : 'document', // Restore for App.jsx compatibility
                    vendor: s.vendor || (s.type === 'PPN' ? 'Pajak Pertambahan Nilai' : (s.type === 'PPH' ? 'Pajak Penghasilan' : '')),
                    amount: s.amount || 0,
                    folderId: s.folderId,
                    slotId: s.slotId,
                    data: s
                };
            })
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
