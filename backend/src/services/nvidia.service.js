// SENTINNELL_PRO/backend/src/services/nvidia.service.js
const { OpenAI } = require('openai');
const config = require('../config');
const logger = require('../utils/logger');
const client = new OpenAI({
    apiKey: config.nvidia.apiKey,
    baseURL: config.nvidia.baseURL,
    timeout: 30000, // 30 segundos de timeout
    maxRetries: 3    // Até 3 tentativas automáticas em caso de falha de rede ou 5xx
});
const normalizeModelId = (modelId) => {
    if (!modelId) return config.nvidia.defaultModel;
    const id = String(modelId).trim();
    // Se o modelo já tem um prefixo (como nvidia/, meta/, mistralai/), mantemos como está.
    // O erro 404 ocorre porque a API espera o ID completo para alguns modelos novos da própria NVIDIA.
    return id;
};
async function chatCompletion(messages, model, options = {}) {
    const apiModel = normalizeModelId(model);
    const resolvedOptions = typeof options === 'boolean'
        ? { stream: options }
        : (options || {});
    const stream = resolvedOptions.stream !== undefined ? resolvedOptions.stream : true;
    const temperature = resolvedOptions.temperature !== undefined ? resolvedOptions.temperature : 0.6;
    const maxTokens = resolvedOptions.maxTokens !== undefined ? resolvedOptions.maxTokens : 2048;
    logger.info(`Chamando NVIDIA NIM: ${apiModel}`);
    try {
        return await client.chat.completions.create({
            model: apiModel,
            messages,
            stream,
            temperature,
            max_tokens: maxTokens
        });
    } catch (error) {
        logger.error(`Erro na API NVIDIA: ${error.message}`);
        throw error;
    }
}
async function listModelsRaw() {
    try {
        const response = await client.models.list();
        return response.data;
    } catch (error) {
        logger.error(`Erro ao listar modelos: ${error.message}`);
        return [];
    }
}
async function listModels() {
    try {
        const response = await client.models.list();
        // Filtramos para manter apenas modelos de Chat/Instruct
        // Removemos: vision, embed, rerank, clip, vlm, parse
        const filteredModels = response.data
            .map(m => m.id)
            .filter(id => {
                const lowerId = id.toLowerCase();
                return (lowerId.includes('instruct') || lowerId.includes('chat')) &&
                    !lowerId.includes('vision') &&
                    !lowerId.includes('embed') &&
                    !lowerId.includes('rerank') &&
                    !lowerId.includes('clip') &&
                    !lowerId.includes('vlm') &&
                    !lowerId.includes('parse') &&
                    !lowerId.includes('reward');
            })
            .sort();
        logger.debug(`Modelos filtrados: ${filteredModels.join(', ')}`);
        logger.debug(`Total de modelos antes do filtro: ${response.data.length}`);
        logger.debug(`Total de modelos após filtro: ${filteredModels.length}`);
        return filteredModels;
    } catch (error) {
        logger.error(`Erro ao listar modelos: ${error.message}`);
        return [];
    }
}
module.exports = {
    chatCompletion,
    listModelsRaw,
    listModels
};

