// SENTINNELL_PRO/backend/src/services/embedding.service.js
const { OpenAI } = require('openai');
const config = require('../config');
const logger = require('../utils/logger');
const nvidiaClient = new OpenAI({
    apiKey: config.nvidia.apiKey,
    baseURL: config.nvidia.baseURL
});
/**
 * Gera embedding para um texto usando o modelo de elite da NVIDIA.
 * Implementa chunking inteligente para lidar com extra tokens.
 */
async function generateEmbedding(text, inputType = 'passage') {
    if (!text || typeof text !== 'string') return null;
    const MAX_CHARS = 4000; // Limite conservador para evitar erros de token
    // Se o texto for pequeno, processa direto
    if (text.length <= MAX_CHARS) {
        return await _callEmbeddingAPI(text, inputType);
    }
    // Caso contrário, aplica chunking e agregação (Mean Pooling)
    logger.info(`Texto longo detectado (${text.length} chars). Aplicando chunking...`);
    const chunks = _splitText(text, MAX_CHARS);
    const vectors = await Promise.all(chunks.map(chunk => _callEmbeddingAPI(chunk, inputType)));
    // Filtra nulos e calcula a média
    const validVectors = vectors.filter(v => v !== null);
    if (validVectors.length === 0) return null;
    // Mean Pooling logic
    const dim = validVectors[0].length;
    const meanVector = new Array(dim).fill(0);
    for (let i = 0; i < dim; i++) {
        let sum = 0;
        for (const vec of validVectors) {
            sum += vec[i];
        }
        meanVector[i] = sum / validVectors.length;
    }
    return meanVector;
}
/**
 * Recurso Rerank da NVIDIA para robustez máxima.
 */
async function rerank(query, documents, topN = 5) {
    if (!documents || documents.length === 0) return [];
    try {
        // A API da NVIDIA exige que a URL use underscores (_) para o ID do modelo,
        // mas o campo 'model' no payload deve manter os pontos (.).
        const modelUrlId = config.nvidia.rerankModel.replaceAll('.', '_');
        const url = `https://ai.api.nvidia.com/v1/retrieval/${modelUrlId}/reranking`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.nvidia.apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.nvidia.rerankModel,
                query: { text: query },
                passages: documents.map(doc => ({ text: doc.content })),
                top_n: topN
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`NVIDIA Rerank API error (${response.status}): ${errorText}`);
        }
        const data = await response.json();
        // Mapeia os scores de volta para os documentos originais
        if (!data.rankings) return documents;
        return data.rankings.map(res => ({
            ...documents[res.index],
            relevanceScore: res.logit ?? res.relevance_score
        })).sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    } catch (error) {
        logger.error(`Erro no NVIDIA Rerank: ${error.message}`);
        return documents; // Fallback para a ordem original em caso de erro
    }
}
/**
 * Chamada interna para a API NVIDIA
 */
async function _callEmbeddingAPI(input, inputType) {
    try {
        const response = await nvidiaClient.embeddings.create({
            model: config.nvidia.embeddingModel,
            input,
            input_type: inputType,
            encoding_format: 'float'
        });
        return response.data[0].embedding;
    } catch (error) {
        logger.error(`Erro na API de Embedding (${inputType}): ${error.message}`);
        return null;
    }
}
/**
 * Divisão simples de texto para chunking
 */
function _splitText(text, size) {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
        chunks.push(text.substring(i, i + size));
    }
    return chunks;
}
module.exports = {
    generateEmbedding,
    rerank
};

