// SENTINNELL_PRO/backend/src/services/context.service.js
const { getCoreLaws } = require('./constitution');
const vortex = require('./vortex.service');
const logger = require('../utils/logger');
async function buildSystemMessage(messages = []) {
    const coreLaws = getCoreLaws();
    let systemContent = `
            ${coreLaws}
            ---
            CONTEXTO DINAMICO DA MEMORIA:
        `;
    const lastMessage = messages[messages.length - 1]?.content;
    if (lastMessage) {
        const context = await vortex.recall(lastMessage);
        if (context && context.length > 0) {
            const contextSummary = context
                .map(item => `[ID: ${item.id}, Tipo: ${item.type}] ${item.content}`)
                .join('\n');
            systemContent += `\n${contextSummary}\n`;
            logger.debug(`[VORTEX] Contexto injetado (${context.length} itens)`);
        }
    }
    return systemContent;
}
module.exports = {
    buildSystemMessage
};

