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
    ],
    comparison: [
        "bandingkan pph januari dan februari",
        "perbandingan ppn bulan maret vs april",
        "selisih pajak bulan ini dengan bulan lalu",
        "perkembangan pph dari januari sampai maret",
        "tampilkan perbedaan pembetulan 0 dan 1"
    ],
    trend_analysis: [
        "analisa trend pajak bulan depan",
        "prediksi pph untuk maret 2024",
        "proyeksi ppn dari trend bulan lalu",
        "perkiraan jumlah pajak kedepannya",
        "bagaimana trend pembayaran pph kita"
    ],
    tax_lookup: [
        "apa itu jasa konstruksi",
        "tarif pph 23 untuk sewa",
        "berapa rate pajak royalti",
        "kode objek pajak jasa teknik",
        "penjelasan mengenai pph pasal 4 ayat 2",
        "daftar objek pajak pph 21"
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

    return { intent: maxSim > 0.55 ? bestIntent : null, score: maxSim };
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
        months: [], // For comparison
        years: [],  // For comparison
        type: null,
        taxType: null,
        pembetulan: null,
        semanticConfidence: 0
    };

    // 1. Keyword Overrides (Strong indicators)
    if (q.includes('banding') || q.includes('vs') || q.includes('perbandingan') || q.includes('selisih')) {
        intent.type = 'comparison';
    } else if (q.includes('trend') || q.includes('proyeksi') || q.includes('prediksi') || q.includes('depan')) {
        intent.type = 'trend_analysis';
    } else if (q.includes('pemeriksaan') || q.includes('audit')) {
        intent.type = 'audit_status';
    } else if (q.includes('apa itu') || q.includes('tarif') || q.includes('rate') || q.includes('kode') || q.includes('objek pajak')) {
        intent.type = 'tax_lookup';
    }

    // 2. Semantic Classification (Fallback or refinement)
    if (!intent.type && queryVector) {
        const semantic = await classifyIntentSemantically(queryVector);
        if (semantic.intent) {
            intent.type = semantic.intent;
            intent.semanticConfidence = semantic.score;
        }
    }

    // 2. Parse Amount (jt/juta/rb/ribu) - Improved to ignore years
    const amountMatch = q.match(/(>|<|diatas|dibawah|di atas|di bawah)?\s*(\b\d{5,}\b|\b\d+(?:\.\d+)?\s*(jt|juta|rb|ribu|k)\b)/i);
    if (amountMatch) {
        let valueStr = amountMatch[2];
        let value = parseFloat(valueStr);
        const unit = amountMatch[3]?.toLowerCase();
        if (unit === 'jt' || unit === 'juta') value *= 1000000;
        else if (unit === 'rb' || unit === 'ribu' || unit === 'k') value *= 1000;
        else if (valueStr.length < 5) value = null; // Ignore small numbers like 2024

        if (value !== null) {
            const modifier = amountMatch[1];
            if (modifier?.includes('>') || modifier?.includes('atas')) intent.minAmount = value;
            else if (modifier?.includes('<') || modifier?.includes('bawah')) intent.maxAmount = value;
            else intent.minAmount = value;
        }
    }

    // 3. Parse Date/Month (Improved for Multi-entity)
    const monthPatterns = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember',
        'jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agt', 'sep', 'okt', 'nov', 'des'];

    // Find all month occurrences
    monthPatterns.forEach((m, idx) => {
        const regex = new RegExp(`\\b${m}\\b`, 'gi');
        if (q.match(regex)) {
            const mVal = (idx % 12) + 1;
            if (!intent.months.includes(mVal)) intent.months.push(mVal);
        }
    });
    if (intent.months.length > 0) intent.month = intent.months[0];

    // Find all years
    const yearMatches = q.match(/\b(20\d{2})\b/g);
    if (yearMatches) {
        intent.years = yearMatches.map(y => parseInt(y));
        intent.year = intent.years[0];
    }

    // 4. Extract Vendor
    const vendorMatch = q.match(/dari\s+([^>|<|bulan|tahun|diatas|dibawah|dan|vs]+)/);
    if (vendorMatch) {
        intent.vendor = vendorMatch[1].trim();
    }

    // 5. Special Keywords (Already handled in Step 1, but keep specific entity overrides)
    if (q.includes('pph')) intent.taxType = 'PPH';
    else if (q.includes('ppn')) intent.taxType = 'PPN';

    const pembetulanMatch = q.match(/pembetulan\s*(\d+)/i);
    if (pembetulanMatch) intent.pembetulan = parseInt(pembetulanMatch[1]);

    // 6. Final check for aggregation if no other intent found
    if (!intent.type) {
        if (q.includes('total') || q.includes('berapa') || q.includes('jumlah')) {
            if (intent.taxType) intent.type = 'aggregation';
        }
    }

    return intent;
}
