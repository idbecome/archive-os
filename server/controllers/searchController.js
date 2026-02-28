import { handleError } from '../utils/errorHandler.js';
import { knex } from '../db.js';
import {
    generateEmbedding,
    cosineSimilarity,
    parseIntent,
    generateAnswer,
    vectorStore
} from '../ai_search.js';

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
        handleError(res, err, "SEARCH Error");
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
        } else if (['aggregation', 'comparison', 'over_under_payment', 'over_under_payment_timeline'].includes(intent.type)) {
            // Fetch relevant tax summaries
            let queryBuilder = knex('tax_summaries');
            if (intent.taxType) queryBuilder = queryBuilder.where('type', intent.taxType);

            // Handle multiple months/years filtering securely
            if (intent.years && intent.years.length > 0) {
                queryBuilder = queryBuilder.whereIn('year', intent.years);
            }

            if (intent.months && intent.months.length > 0) {
                const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                const selectedMonthNames = intent.months.map(m => monthNames[m - 1]);
                queryBuilder = queryBuilder.whereIn('month', selectedMonthNames);
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

                        if (intent.ppnTarget === 'IN') {
                            detail = `Total PPN Masukan: Rp ${inTotal.toLocaleString()}`;
                        } else if (intent.ppnTarget === 'OUT') {
                            detail = `Total PPN Keluaran: Rp ${outTotal.toLocaleString()}`;
                        } else {
                            detail = `PPN Masukan: Rp ${inTotal.toLocaleString()}, PPN Keluaran: Rp ${outTotal.toLocaleString()}, Net: Rp ${(outTotal - inTotal).toLocaleString()}`;
                        }
                    }
                    return `${s.month} ${s.year} (${s.type}) -> ${detail}`;
                });
            } else if (intent.type === 'over_under_payment' || intent.type === 'over_under_payment_timeline') {
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
                        return `${label}: In=Rp ${inT.toLocaleString()}, Out=Rp ${outT.toLocaleString()}, Net=Rp ${(outT - inT).toLocaleString()} (Status: ${outT - inT > 0 ? 'Kurang Bayar' : 'Lebih Bayar'})`;
                    }
                });
            }

            if (contextData.length === 0) {
                answer = "Maaf, saya tidak menemukan data pajak yang sesuai dengan kriteria yang diminta di basis data.";
            } else {
                if (intent.type === 'comparison' || intent.type === 'aggregation') {
                    answer = "Berikut adalah rangkuman data pajak yang Anda minta:\n" + contextData.map(c => `- ${c}`).join("\n");
                } else {
                    answer = await generateAnswer(text, contextData);
                }
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
                let finalMatchType = 'document';
                if (intent.type === 'tax_lookup') {
                    finalMatchType = 'tax_object';
                } else if (['aggregation', 'comparison', 'over_under_payment'].includes(intent.type)) {
                    finalMatchType = 'tax_summary';
                } else {
                    finalMatchType = s.category || 'document';
                }

                return {
                    id: s.id,
                    title: s.title || s.name || (s.month ? `${s.month} ${s.year} (${s.type})` : 'Untitled'),
                    type: finalMatchType,
                    matchType: finalMatchType,
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
        handleError(res, new Error("AI Service Error"), "SEARCH Error");
    }
};

export const semanticSearch = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: "Query required" });

        // 1. Keyword Searches across multiple tables
        const [kwDocs, kwInvoices, kwTaxObjects, kwExternal, kwInventory] = await Promise.all([
            knex('documents')
                .where('title', 'like', `%${query}%`)
                .orWhere('ocrContent', 'like', `%${query}%`)
                .limit(20),
            knex('invoices')
                .where('invoice_no', 'like', `%${query}%`)
                .orWhere('tax_invoice_no', 'like', `%${query}%`)
                .orWhere('vendor', 'like', `%${query}%`)
                .limit(20),
            knex('tax_objects')
                .where('name', 'like', `%${query}%`)
                .orWhere('identity_number', 'like', `%${query}%`)
                .orWhere('tax_object_name', 'like', `%${query}%`)
                .limit(20),
            knex('external_items')
                .where('boxId', 'like', `%${query}%`)
                .orWhere('destination', 'like', `%${query}%`)
                .orWhere('sender', 'like', `%${query}%`)
                .limit(20),
            knex('inventory')
                .where('box_data', 'like', `%${query}%`)
                .limit(20)
        ]);

        // 2. Semantic Vector Search via High-Speed RAM Cache
        const queryVector = await generateEmbedding(query);
        const semanticMatches = vectorStore.searchNearest(queryVector, 0.4, 15);

        // 3. Merging and Deduplication
        const resultsMap = new Map();

        // Add semantic results first
        semanticMatches.forEach(r => resultsMap.set(`${r.matchType}-${r.id}`, r));

        // Keyword matches get top priority (Score 1.0)
        kwDocs.forEach(d => {
            const matchType = d.category || (d.title.toLowerCase().includes('invoice') ? 'invoice' : 'document');
            resultsMap.set(`${matchType}-${d.id}`, {
                id: d.id,
                name: d.title,
                date: d.uploadDate,
                size: d.size,
                matchType,
                score: 1.0,
                data: d
            });
        });

        kwInvoices.forEach(inv => {
            // Check if we already have this as a document to avoid double display 
            // Often invoices have a corresponding document.
            resultsMap.set(`invoice-${inv.id}`, {
                id: inv.id,
                name: `${inv.vendor} (No: ${inv.invoice_no})`,
                date: inv.payment_date,
                url: inv.file_url, // Add url for preview
                size: inv.tax_invoice_no || 'Invoice',
                matchType: 'invoice',
                score: 1.0,
                data: inv
            });
        });

        kwTaxObjects.forEach(t => {
            resultsMap.set(`tax_object-${t.id}`, {
                id: t.id,
                name: t.name,
                date: t.created_at,
                url: null, // No preview for WP data
                size: `${t.identity_number} (${t.tax_object_name})`,
                matchType: 'tax_object',
                score: 1.0,
                data: t
            });
        });

        kwExternal.forEach(e => {
            resultsMap.set(`external_item-${e.id}`, {
                id: e.id,
                name: `Box ${e.boxId}`,
                date: e.sentDate,
                url: null, // No preview for external
                size: `${e.destination} • ${e.sender}`,
                matchType: 'external_item',
                score: 1.0,
                data: e
            });
        });

        kwInventory.forEach(inv => {
            let boxId = `Slot ${inv.id}`;
            try {
                const data = typeof inv.box_data === 'string' ? JSON.parse(inv.box_data) : inv.box_data;
                if (data && data.id) boxId = data.id;
                else if (data && data.box_id) boxId = data.box_id;
            } catch (e) { }

            resultsMap.set(`inventory-${inv.id}`, {
                id: inv.id,
                name: `Gudang: ${boxId}`,
                date: inv.lastUpdated,
                url: null,
                content: inv.box_data, // Add content for snippet display
                size: `${inv.rack}-${inv.shelf}-${inv.position}`,
                matchType: 'inventory',
                score: 1.0,
                data: inv
            });
        });

        const finalResults = Array.from(resultsMap.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 15);

        res.json({ results: finalResults });

    } catch (err) {
        console.error("Hybrid Search Error:", err);
        handleError(res, err, "SEARCH Error");
    }
};
