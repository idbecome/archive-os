import { pipeline } from '@xenova/transformers';

let embedder = null;

/**
 * Initialize the embedding pipeline.
 */
async function initEmbedder() {
    if (!embedder) {
        console.log('[AI Search] Initializing sentence-transformer model...');
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return embedder;
}

/**
 * Generate a vector embedding for a given text.
 * @param {string} text 
 * @returns {Promise<Array<number>>}
 */
export async function generateEmbedding(text) {
    const pipe = await initEmbedder();
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

/**
 * Calculate cosine similarity between two vectors.
 * @param {Array<number>} v1 
 * @param {Array<number>} v2 
 * @returns {number}
 */
export function cosineSimilarity(v1, v2) {
    if (v1.length !== v2.length) return 0;
    let dotProduct = 0;
    for (let i = 0; i < v1.length; i++) {
        dotProduct += v1[i] * v2[i];
    }
    return dotProduct; // Already normalized by pipeline
}

/**
 * Basic NLP Intent Parsing for Archive-OS.
 * Extracts: minAmount, maxAmount, vendor, dateRange.
 * Examples: "invoice > 5jt", "PT Maju Jaya Jan 2024"
 * @param {string} query 
 * @returns {object}
 */
export function parseIntent(query) {
    const q = query.toLowerCase();
    const intent = {
        minAmount: null,
        maxAmount: null,
        vendor: null,
        month: null,
        year: null
    };

    // 1. Parse Amount (jt/juta/rb/ribu)
    const amountMatch = q.match(/(>|<|diatas|dibawah|di atas|di bawah)?\s*(\d+(?:\.\d+)?)\s*(jt|juta|rb|ribu|k)?/i);
    if (amountMatch) {
        let value = parseFloat(amountMatch[2]);
        const unit = amountMatch[3]?.toLowerCase();
        if (unit === 'jt' || unit === 'juta') value *= 1000000;
        if (unit === 'rb' || unit === 'ribu' || unit === 'k') value *= 1000;

        const modifier = amountMatch[1];
        if (modifier?.includes('>') || modifier?.includes('atas')) intent.minAmount = value;
        else if (modifier?.includes('<') || modifier?.includes('bawah')) intent.maxAmount = value;
        else intent.minAmount = value; // Default to min if just number? Or exact? 
    }

    // 2. Parse Date/Month
    const months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember',
        'jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agt', 'sep', 'okt', 'nov', 'des'];
    for (let i = 0; i < months.length; i++) {
        if (q.includes(months[i])) {
            intent.month = (i % 12) + 1;
            break;
        }
    }

    const yearMatch = q.match(/\b(20\d{2})\b/);
    if (yearMatch) intent.year = parseInt(yearMatch[1]);

    // 3. Extract Vendor (simple heuristic: words after "dari" or capitalized words)
    const vendorMatch = q.match(/dari\s+([^>|<|bulan|tahun|diatas|dibawah]+)/);
    if (vendorMatch) {
        intent.vendor = vendorMatch[1].trim();
    }

    return intent;
}
