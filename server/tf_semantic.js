import * as tf from '@tensorflow/tfjs-node';
import * as use from '@tensorflow-models/universal-sentence-encoder';

let model = null;

export const loadModel = async () => {
    if (model) return model;
    console.log("Loading TensorFlow Universal Sentence Encoder...");
    try {
        model = await use.load();
        console.log("TensorFlow USE Model Loaded Successfully.");
        return model;
    } catch (error) {
        console.error("Failed to load USE model:", error);
        throw error;
    }
};

export const getEmbedding = async (text) => {
    if (!model) await loadModel();
    if (!text || text.trim() === "") return null;

    // use.load() returns a model that has an embed() method
    const embeddings = await model.embed([text]);
    const vector = await embeddings.array();

    // Dispose tensor to free memory
    embeddings.dispose();

    // Return the first (and only) embedding
    return vector[0];
};

// Optimized Cosine Similarity for 512d vectors
export const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA && magnitudeB) {
        return dotProduct / (magnitudeA * magnitudeB);
    }
    return 0;
};
