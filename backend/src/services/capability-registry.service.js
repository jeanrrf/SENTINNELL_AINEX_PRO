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

function inferCapabilities(modelId = '') {
    const lower = String(modelId).toLowerCase();
    return {
        id: modelId,
        isChat: lower.includes('instruct') || lower.includes('chat') || lower.includes('nemotron'),
        supportsVision: lower.includes('vision') || lower.includes('vl') || lower.includes('multimodal'),
        supportsMultimodal: lower.includes('multimodal'),
        isParse: lower.includes('parse'),
        isOcr: lower.includes('ocdr') || lower.includes('ocr'),
        isSafety: lower.includes('safety') || lower.includes('guard'),
        sizeB: extractModelSizeB(lower)
    };
}

function buildCatalog(modelIds = [], source = 'live') {
    const byId = new Map();
    const models = [];
    for (const id of modelIds) {
        if (!id) continue;
        const caps = inferCapabilities(id);
        models.push(caps);
        byId.set(id, caps);
    }
    return { models, byId, source };
}

async function refreshCatalog() {
    const modelData = await nvidia.listModelsRaw();
    const modelIds = modelData.map(entry => entry.id).filter(Boolean);
    if (!modelIds.length) {
        throw new Error('catalog_empty');
    }
    return buildCatalog(modelIds, 'live');
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
        const fallback = buildCatalog(config.router.fallbackCatalog || [], 'fallback');
        cache.catalog = fallback;
        cache.expiresAt = now + config.router.modelsCacheTtlMs;
        return fallback;
    }
}

module.exports = {
    getCatalog,
    inferCapabilities,
    extractModelSizeB
};

