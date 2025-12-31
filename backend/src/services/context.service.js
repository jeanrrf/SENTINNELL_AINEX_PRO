// SENTINNELL_PRO/backend/src/services/context.service.js
const { getCoreLaws } = require('./constitution');
const vortex = require('./vortex.service');
const memory = require('./memory.service');
const logger = require('../utils/logger');

function formatAffectiveContext(context) {
    const entries = Object.entries(context || {});
    if (entries.length === 0) return 'none';
    return entries.map(([key, value]) => `- ${key}: ${value}`).join('\n');
}

function formatMemoryItems(items) {
    return items
        .map(item => {
            const tier = item.tier ? `, Tier: ${item.tier}` : '';
            const type = item.type ? `, Tipo: ${item.type}` : '';
            return `[ID: ${item.id}${type}${tier}] ${item.content}`;
        })
        .join('\n');
}

async function buildSystemMessage(messages = []) {
    const coreLaws = getCoreLaws();
    const lastMessage = messages[messages.length - 1]?.content?.trim();
    const [stats, affectiveContext, recentMemories] = await Promise.all([
        memory.getMemoryStats(),
        memory.getSystemContext(),
        memory.getRecentMemories(5)
    ]);
    let systemContent = `
            ${coreLaws}
            ---
            SYSTEM_RESOURCES:
            - local_memory_db: available
            - vector_index: available
            - do not claim lack of access to local memory or vector index; use blocks below
            - use MEMORY_STATUS for totals when asked
            ---
            MEMORY_STATUS:
            L1_SESSIONS=${stats.sessions}
            L2_TOTAL=${stats.memoriesTotal}
            L2_EMBEDDED=${stats.memoriesEmbedded}
            L2_RAW=${stats.memoriesWithoutEmbedding}
            L3_KEYS=${stats.affectiveKeys}
            ---
            AFFECTIVE_CONTEXT:
            ${formatAffectiveContext(affectiveContext)}
            ---
            CONTEXTO DINAMICO DA MEMORIA:
        `;
    let injected = false;
    if (lastMessage) {
        const context = await vortex.recall(lastMessage);
        if (context && context.length > 0) {
            const contextSummary = formatMemoryItems(context);
            systemContent += `\n${contextSummary}\n`;
            injected = true;
            logger.debug(`[VORTEX] Contexto injetado (${context.length} itens)`);
        }
    }
    if (!injected) {
        if (recentMemories && recentMemories.length > 0) {
            systemContent += `\nRECENT_MEMORIES:\n${formatMemoryItems(recentMemories)}\n`;
        } else {
            systemContent += '\nRECENT_MEMORIES: none\n';
        }
    }
    return systemContent;
}
module.exports = {
    buildSystemMessage
};

