import { Ollama } from 'ollama';
import { getConfig } from '../config/config';

let client: Ollama | null = null;

function getClient(): Ollama {
    if (!client) {
        client = new Ollama({ host: process.env.OLLAMA_HOST || 'http://localhost:11434' });
    }
    return client;
}

/**
 * Generate embedding for a text string using Ollama.
 * Uses the configured embedding model from config, falls back to nomic-embed-text.
 */
export async function generateEmbedding(text: string, model?: string): Promise<number[]> {
    // Use configured model, with sensible fallbacks
    const config = getConfig().getConfig();
    const embeddingModel = model || (config as any).memory?.embedding_model || 'nomic-embed-text';
    
    try {
        const response = await getClient().embeddings({
            model: embeddingModel,
            prompt: text.slice(0, 8000), // context limit safety
        });
        return response.embedding;
    } catch (error) {
        // Silently return empty - the brain will fall back to FTS
        return [];
    }
}

/**
 * Cosine similarity between two vectors.
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length || vec1.length === 0) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        norm1 += vec1[i] * vec1[i];
        norm2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
}
