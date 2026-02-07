
import { pipeline } from '@xenova/transformers';

// Global cache for the model
let extractor = null;

export async function getEmbedding(text) {
    if (!extractor) {
        console.log("Loading embedding model...");
        // Use a smaller quantized model for performance
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log("Model loaded.");
    }

    try {
        // Generate embedding
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        // output is a Tensor, we need array
        return Array.from(output.data);
    } catch (error) {
        console.error("Embedding error:", error);
        return null;
    }
}

export function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
