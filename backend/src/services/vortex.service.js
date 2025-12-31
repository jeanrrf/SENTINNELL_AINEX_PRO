// SENTINNELL_PRO/backend/src/services/vortex.service.js
const { generateEmbedding, rerank } = require("./embedding.service");
const { chatCompletion } = require("./nvidia.service");
const db = require("./db.service");
const logger = require("../utils/logger");
const config = require("../config");
/**
 * Motor Vortex: Gerencia a inteligência da memória de longo prazo.
 */
/**
 * Destilação Cognitiva: Extrai fatos, história e conhecimentos de uma sessão.
 */
async function distillAndSave(sessionId, history, userConsent = {}) {
  try {
    const prompt = `
            Aja como um Destilador Cognitivo de Elite. Sua tarefa é analisar o histórico de chat e extrair APENAS informações que valham a pena ser guardadas na memória de longo prazo.
            DIRETRIZES:
            1. Se houver dados biográficos, preferências ou história sobre Jean (O Criador), classifique como "CONSTITUIÇÃO" (Nível L3).
            2. Se houver conhecimentos técnicos ou fatos gerais, classifique como "KNOWLEDGE" (Nível L2).
            3. Ignore conversas triviais, cumprimentos ou redundâncias.
            4. Para cada item, crie um "neural_map" com { "subject": "...", "sub": "..." }.
            RETORNE EXCLUSIVAMENTE UM JSON ARRAY:
            [{ "content": "fato condensado", "type": "constitution|knowledge", "neural_map": { "subject": "", "sub": "" }, "tier": "ouro|prata|bronze" }]
            HISTÓRICO:
            ${JSON.stringify(history)}
        `;
    const response = await chatCompletion(
      [{ role: "system", content: prompt }],
      config.nvidia.powerModel, // Usamos o modelo 70B para extração de alta qualidade
      { stream: false }
    );
    let extracted = [];
    try {
      const jsonStr =
        response.choices[0].message.content.match(/\[[\s\S]*\]/)?.[0] || "[]";
      extracted = JSON.parse(jsonStr);
    } catch (e) {
      logger.error("Erro ao parsear destilação Vortex");
      return { success: false, count: 0 };
    }
    // Salva apenas o que foi aprovado ou filtrado
    for (const item of extracted) {
      const embedding = await generateEmbedding(item.content);
      const serializedEmbedding = embedding ? JSON.stringify(embedding) : null;
      const id = `vtx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.run(
        `INSERT INTO memories (id, content, type, tier, neural_map, embedding, source_session_id, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          item.content,
          item.type,
          item.tier || "bronze",
          JSON.stringify(item.neural_map),
          serializedEmbedding,
          sessionId,
          Date.now(),
        ]
      );
    }
    return { success: true, count: extracted.length };
  } catch (error) {
    logger.error(`Erro no Vortex distill: ${error.message}`);
    return { success: false, error: error.message };
  }
}
/**
 * Busca Semântica Avançada com Rerank.
 */
async function recall(query, type = null, limit = 10) {
  try {
    const queryVector = await generateEmbedding(query, "query");
    if (!queryVector) return [];
    let sql =
      "SELECT id, content, type, neural_map, embedding FROM memories WHERE embedding IS NOT NULL AND embedding != 'null'";
    const params = [];
    if (type) {
      sql += " AND type = ?";
      params.push(type);
    }
    const rows = await db.all(sql, params);
    // Similaridade de cosseno manual (JavaScript performance)
    const scored = rows
      .map((row) => {
        let rowVec;
        try {
          rowVec = JSON.parse(row.embedding);
        } catch (err) {
          return null;
        }
        if (!Array.isArray(rowVec) || rowVec.length === 0) return null;
        return {
          ...row,
          similarity: _cosineSimilarity(queryVector, rowVec),
        };
      })
      .filter((r) => r && r.similarity > 0.4) // Threshold de 40%
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20); // Pega os 20 melhores para o Rerank
    // Reranking de Elite (NVIDIA)
    const finalResults = await rerank(query, scored, limit);
    return finalResults;
  } catch (error) {
    logger.error(`Erro no Vortex recall: ${error.message}`);
    return [];
  }
}
function _cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (!denom) return 0;
  return dotProduct / denom;
}
module.exports = {
  distillAndSave,
  recall,
};
