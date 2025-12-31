// SENTINNELL_PRO/backend/src/services/gemini.service.js
const config = require('../config');
const logger = require('../utils/logger');
const fetchFn =
    typeof fetch === 'function'
        ? fetch
        : (typeof globalThis !== 'undefined' ? globalThis.fetch : undefined);
function _normalizeModelName(model) {
    if (!model) return config.google.defaultModel;
    const normalized = model.trim();
    return normalized.startsWith('models/') ? normalized : `models/${normalized}`;
}
async function dialogCompletion(messages, model) {
    if (!config.google.apiKey) {
        throw new Error('fetch nao esta disponivel no ambiente Node');
    }
    const targetModel = _normalizeModelName(model || config.google.defaultModel);
    const url = `${config.google.baseURL}/${targetModel}:generateMessage?key=${config.google.apiKey}`;
    const body = {
        temperature: config.google.temperature,
        candidateCount: 1,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: config.google.maxOutputTokens,
        messages: (messages || []).map(message => ({
            role: message.role,
            content: [{ type: 'text', text: message.content }]
        }))
    };
    if (typeof fetchFn !== 'function') {
        throw new Error('fetch nao esta disponivel no ambiente Node');
    }
    try {
        const response = await fetchFn(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Google Dialog API (${response.status}): ${errorText}`);
        }
        const data = await response.json();
        const candidate = data?.candidates?.[0];
        const contentBlocks = candidate?.content || [];
        const text = contentBlocks.map(block => block?.text || '').filter(Boolean).join('');
        return text;
    } catch (error) {
        logger.error(`Erro no Gemini Dialog: ${error.message}`);
        throw error;
    }
}
module.exports = {
    dialogCompletion
};

