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
 * Semantic Intent Classification using Anchor Vectors.
 */
const ANCHOR_QUERIES = {
    aggregation: [
        "berapa total pph bulan ini",
        "jumlah seluruh pph januari",
        "total akumulasi ppn",
        "hitung jumlah pajak januari 2024",
        "berapa pajak yang sudah dibayar"
    ],
    audit_status: [
        "status pemeriksaan pajak sampai mana",
        "audit pajak progres",
        "surat permintaan penjelasan data",
        "pemeriksaan lapangan sampai tahap apa",
        "daftar pending audit"
    ]
};

let cachedAnchors = null;

async function getAnchorVectors() {
    if (cachedAnchors) return cachedAnchors;
    const anchors = {};
    for (const [intent, queries] of Object.entries(ANCHOR_QUERIES)) {
        const vectors = await Promise.all(queries.map(q => generateEmbedding(q)));
        // Average vector for the intent
        const avg = new Array(vectors[0].length).fill(0);
        vectors.forEach(v => v.forEach((val, i) => avg[i] += val));
        anchors[intent] = avg.map(v => v / vectors.length);
    }
    cachedAnchors = anchors;
    return anchors;
}

export async function classifyIntentSemantically(queryVector) {
    const anchors = await getAnchorVectors();
    let bestIntent = null;
    let maxSim = -1;

    for (const [intent, vector] of Object.entries(anchors)) {
        const sim = cosineSimilarity(queryVector, vector);
        if (sim > maxSim) {
            maxSim = sim;
            bestIntent = intent;
        }
    }

    return { intent: maxSim > 0.6 ? bestIntent : null, score: maxSim };
}

/**
 * Basic NLP Intent Parsing for Archive-OS.
 * Extracts: minAmount, maxAmount, vendor, dateRange.
 * Examples: "invoice > 5jt", "PT Maju Jaya Jan 2024"
 * @param {string} query 
 * @param {Array<number>} queryVector Optional query vector for semantic classification
 * @returns {object}
 */
export async function parseIntent(query, queryVector = null) {
    const q = query.toLowerCase();
    const intent = {
        minAmount: null,
        maxAmount: null,
        vendor: null,
        month: null,
        year: null,
        type: null,
        taxType: null,
        semanticConfidence: 0
    };

    // 1. Semantic Classification (If vector provided)
    if (queryVector) {
        const semantic = await classifyIntentSemantically(queryVector);
        if (semantic.intent) {
            intent.type = semantic.intent;
            intent.semanticConfidence = semantic.score;
        }
    }

    // 2. Parse Amount (jt/juta/rb/ribu)
    const amountMatch = q.match(/(>|<|diatas|dibawah|di atas|di bawah)?\s*(\d+(?:\.\d+)?)\s*(jt|juta|rb|ribu|k)?/i);
    if (amountMatch) {
        let value = parseFloat(amountMatch[2]);
        const unit = amountMatch[3]?.toLowerCase();
        if (unit === 'jt' || unit === 'juta') value *= 1000000;
        if (unit === 'rb' || unit === 'ribu' || unit === 'k') value *= 1000;

        const modifier = amountMatch[1];
        if (modifier?.includes('>') || modifier?.includes('atas')) intent.minAmount = value;
        else if (modifier?.includes('<') || modifier?.includes('bawah')) intent.maxAmount = value;
        else intent.minAmount = value;
    }

    // 3. Parse Date/Month
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

    // 4. Extract Vendor
    const vendorMatch = q.match(/dari\s+([^>|<|bulan|tahun|diatas|dibawah]+)/);
    if (vendorMatch) {
        intent.vendor = vendorMatch[1].trim();
    }

    // 5. Keyword fallbacks/adjustments (Override semantic if very clear keywords exist)
    if (q.includes('pph')) intent.taxType = 'PPH';
    else if (q.includes('ppn')) intent.taxType = 'PPN';

    if (!intent.type) {
        if (q.includes('total') || q.includes('berapa') || q.includes('jumlah')) {
            if (intent.taxType) intent.type = 'aggregation';
        }
        if (q.includes('pemeriksaan') || q.includes('audit')) {
            intent.type = 'audit_status';
        }
    }

    return intent;
}
