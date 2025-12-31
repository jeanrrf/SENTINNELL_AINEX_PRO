// SENTINNELL_PRO/backend/src/services/memory.service.js
const db = require('./db.service');
const logger = require('../utils/logger');
/**
 * L2: Memórias de Longo Prazo / Conhecimento
 */
async function saveKnowledge(content, tier = 'bronze', tags = [], sessionId = null) {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    try {
        await db.run(
            `INSERT INTO memories (id, content, tier, tags, source_session_id, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?)`,
            [id, content, tier, JSON.stringify(tags), sessionId, now]
        );
        logger.success(`Memória L2 salva: ${id} (${tier})`);
        return id;
    } catch (err) {
        logger.error('Erro ao salvar memória L2:', err.message);
        throw err;
    }
}
/**
 * L3: Memória Afetiva / Preferências do Usuário
 * Identifica e armazena padrões de preferência ou contexto emocional
 */
async function updateAffectiveMemory(key, value, context = '') {
    const now = Date.now();
    try {
        const existing = await db.get('SELECT * FROM affective_memories WHERE preference_key = ?', [key]);
        if (existing) {
            await db.run(
                `UPDATE affective_memories 
         SET preference_value = ?, emotional_context = ?, lastUpdated = ? 
         WHERE preference_key = ?`,
                [value, context, now, key]
            );
        } else {
            const id = `aff_${Date.now()}`;
            await db.run(
                `INSERT INTO affective_memories (id, preference_key, preference_value, emotional_context, lastUpdated) 
         VALUES (?, ?, ?, ?, ?)`,
                [id, key, value, context, now]
            );
        }
        logger.success(`Memória L3 atualizada: ${key}`);
    } catch (err) {
        logger.error('Erro ao atualizar memória L3:', err.message);
    }
}
async function getSystemContext() {
    try {
        const memories = await db.all('SELECT preference_key, preference_value FROM affective_memories');
        return memories.reduce((acc, curr) => {
            acc[curr.preference_key] = curr.preference_value;
            return acc;
        }, {});
    } catch (err) {
        logger.error('Erro ao buscar contexto afetivo:', err.message);
        return {};
    }
}
module.exports = {
    saveKnowledge,
    updateAffectiveMemory,
    getSystemContext
};

