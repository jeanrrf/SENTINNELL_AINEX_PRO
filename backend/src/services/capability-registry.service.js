// SENTINNELL_PRO/backend/src/services/capability-registry.service.js

const config = require('../config');
const nvidia = require('./nvidia.service');
const logger = require('../utils/logger');

const cache = {
    catalog: null,
    expiresAt: 0
};

function extractModelSizeB(modelId = '') {
    const match = String(modelId).toLowerCase().match(/-(\d+)(?:\.\d+)?b/);
    return match ? parseFloat(match[1]) : null;
}

function getBlueprint() {
    return {
        chatDefault: config.router.defaultTextModel,
        hardTask: config.router.hardTaskModels || [],
        vision: config.router.visionModelId,
        multimodal: config.router.multimodalOmniModelId,
        docParse: config.router.docParseModelId,
        ocr: config.router.ocrModelId,
        safety: config.router.safetyGuardModelId,
        embed: config.nvidia.embeddingModel,
        rerank: config.nvidia.rerankModel
    };
}

function getDenylist() {
    return config.router.modelDenylist || [];
}

function isDeniedModel(modelId = '') {
    const lower = String(modelId).toLowerCase();
    if (lower.includes('video')) return true;
    return getDenylist().some(token => token && lower.includes(token.toLowerCase()));
}

function inferCapabilities(modelId = '') {
    const blueprint = getBlueprint();
    const lower = String(modelId).toLowerCase();
    const isParse = modelId === blueprint.docParse || lower.includes('parse');
    const isOcr = modelId === blueprint.ocr || lower.includes('ocdr') || lower.includes('ocr');
    const isSafety = modelId === blueprint.safety || lower.includes('safety') || lower.includes('guard');
    const isEmbedding = modelId === blueprint.embed || lower.includes('embed');
    const isRerank = modelId === blueprint.rerank || lower.includes('rerank');
    const supportsMultimodal = modelId === blueprint.multimodal || lower.includes('multimodal');
    const supportsVision = modelId === blueprint.vision || supportsMultimodal || lower.includes('vision') || lower.includes('vlm');
    const isVideo = lower.includes('video');
    const isChat =
        (modelId === blueprint.chatDefault ||
            blueprint.hardTask.includes(modelId) ||
            lower.includes('instruct') ||
            lower.includes('chat') ||
            lower.includes('nemotron')) &&
        !isParse &&
        !isEmbedding &&
        !isRerank &&
        !isVideo;

    return {
        id: modelId,
        isChat,
        supportsVision,
        supportsMultimodal,
        isParse,
        isOcr,
        isSafety,
        isEmbedding,
        isRerank,
        isVideo,
        sizeB: extractModelSizeB(lower)
    };
}

function buildCatalog(modelIds = [], source = 'live') {
    const blueprint = getBlueprint();
    const byId = new Map();
    const models = [];
    const duplicateIds = new Set();
    for (const id of modelIds) {
        if (!id) continue;
        if (byId.has(id)) {
            duplicateIds.add(id);
            continue;
        }
        const caps = inferCapabilities(id);
        const recommendedFor = [];
        if (id === blueprint.chatDefault) recommendedFor.push('chat_default');
        if (blueprint.hardTask.includes(id)) recommendedFor.push('hard_task');
        if (id === blueprint.vision) recommendedFor.push('vision');
        if (id === blueprint.multimodal) recommendedFor.push('multimodal');
        if (id === blueprint.docParse) recommendedFor.push('doc_parse');
        if (id === blueprint.ocr) recommendedFor.push('ocr');
        if (id === blueprint.safety) recommendedFor.push('safety');
        if (id === blueprint.embed) recommendedFor.push('embedding');
        if (id === blueprint.rerank) recommendedFor.push('rerank');
        const tags = [];
        if (caps.isChat) tags.push('chat');
        if (caps.supportsVision) tags.push('vision');
        if (caps.supportsMultimodal) tags.push('multimodal');
        if (caps.isParse) tags.push('parse');
        if (caps.isOcr) tags.push('ocr');
        if (caps.isSafety) tags.push('safety');
        if (caps.isEmbedding) tags.push('embedding');
        if (caps.isRerank) tags.push('rerank');
        if (caps.isVideo) tags.push('video');
        models.push({
            ...caps,
            tags,
            recommended: recommendedFor.length > 0,
            recommendedFor
        });
        byId.set(id, caps);
    }
    if (duplicateIds.size) {
        const sample = [...duplicateIds].slice(0, 5).join(', ');
        const suffix = duplicateIds.size > 5 ? '...' : '';
        logger.warn(`[CATALOG] Model ids duplicados detectados: ${sample}${suffix}`);
    }
    return { models, byId, source };
}

async function refreshCatalog() {
    const modelData = await nvidia.listModelsRaw();
    const modelIds = modelData.map(entry => entry.id).filter(Boolean);
    if (!modelIds.length) {
        throw new Error('catalog_empty');
    }
    const filtered = modelIds.filter(id => !isDeniedModel(id));
    return buildCatalog(filtered, 'live');
}

async function getCatalog() {
    const now = Date.now();
    if (cache.catalog && cache.expiresAt > now) {
        return cache.catalog;
    }

    try {
        const catalog = await refreshCatalog();
        cache.catalog = catalog;
        cache.expiresAt = now + config.router.modelsCacheTtlMs;
        return catalog;
    } catch (error) {
        logger.warn(`Falha ao atualizar catalogo de modelos: ${error.message}`);
        if (cache.catalog) return cache.catalog;
        const fallbackIds = (config.router.fallbackCatalog || []).filter(id => !isDeniedModel(id));
        const fallback = buildCatalog(fallbackIds, 'fallback');
        cache.catalog = fallback;
        cache.expiresAt = now + config.router.modelsCacheTtlMs;
        return fallback;
    }
}

module.exports = {
    getCatalog,
    getBlueprint,
    isDeniedModel,
    inferCapabilities,
    extractModelSizeB
};

