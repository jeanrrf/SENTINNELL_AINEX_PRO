// SENTINNELL_PRO/backend/src/services/memory.service.js
const db = require('./db.service');
const logger = require('../utils/logger');
const { generateEmbedding } = require('./embedding.service');
/**
 * L2: Memórias de Longo Prazo / Conhecimento
 */
async function saveKnowledge(
    content,
    tier = 'bronze',
    tags = [],
    sessionId = null,
    type = 'knowledge',
    neuralMap = null
) {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    try {
        const embedding = await generateEmbedding(content, 'passage');
        const serializedEmbedding = embedding ? JSON.stringify(embedding) : null;
        const serializedTags = JSON.stringify(tags);
        const serializedNeuralMap =
            neuralMap && typeof neuralMap !== 'string' ? JSON.stringify(neuralMap) : neuralMap;
        await db.run(
            `INSERT INTO memories (id, content, tier, tags, embedding, source_session_id, type, neural_map, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, content, tier, serializedTags, serializedEmbedding, sessionId, type, serializedNeuralMap, now]
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

async function getMemoryStats() {
    try {
        const memoryCounts = await db.get(
            `SELECT COUNT(*) as total,
                SUM(CASE WHEN embedding IS NOT NULL AND embedding != 'null' THEN 1 ELSE 0 END) as embedded
             FROM memories`
        );
        const sessionCounts = await db.get('SELECT COUNT(*) as total FROM chat_sessions');
        const affectiveCounts = await db.get('SELECT COUNT(*) as total FROM affective_memories');
        const total = memoryCounts?.total ?? 0;
        const embedded = memoryCounts?.embedded ?? 0;
        return {
            sessions: sessionCounts?.total ?? 0,
            memoriesTotal: total,
            memoriesEmbedded: embedded,
            memoriesWithoutEmbedding: Math.max(total - embedded, 0),
            affectiveKeys: affectiveCounts?.total ?? 0
        };
    } catch (err) {
        logger.error('Erro ao buscar estatisticas de memoria:', err.message);
        return {
            sessions: 0,
            memoriesTotal: 0,
            memoriesEmbedded: 0,
            memoriesWithoutEmbedding: 0,
            affectiveKeys: 0
        };
    }
}

async function getRecentMemories(limit = 5) {
    try {
        const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 5;
        return await db.all(
            'SELECT id, content, type, tier, createdAt FROM memories ORDER BY createdAt DESC LIMIT ?',
            [safeLimit]
        );
    } catch (err) {
        logger.error('Erro ao buscar memorias recentes:', err.message);
        return [];
    }
}
module.exports = {
    saveKnowledge,
    updateAffectiveMemory,
    getSystemContext,
    getMemoryStats,
    getRecentMemories
};
