// SENTINNELL_PRO/backend/src/services/db.service.js
const sqlite3 = require('sqlite3').verbose();
const config = require('../config');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
// Garante que a pasta data existe
const dataDir = path.dirname(config.database.path);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
const db = new sqlite3.Database(config.database.path, (err) => {
    if (err) logger.error(`Erro ao conectar ao SQLite: ${err.message}`);
    else logger.success(`Conectado ao banco de dados: ${config.database.path}`);
});
const initializeSchema = () => {
    db.serialize(() => {
        // Memória L1: Sessões de Chat
        db.run(`CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      history TEXT,
      model TEXT,
      createdAt INTEGER,
      updatedAt INTEGER
    )`);
        // Memória L2: Fragmentos de Conhecimento e Memória de Longo Prazo
        db.run(`CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      content TEXT,
      tier TEXT, -- ouro (Longo Prazo), prata (Semanal), bronze (Diário)
      tags TEXT,
      embedding TEXT, -- Busca Semântica
      source_session_id TEXT,
      type TEXT, -- constitution | knowledge
      neural_map TEXT, -- JSON hierarquia de assuntos
      createdAt INTEGER
    )`);
        // Memória L3: Contexto Afetivo e Preferências do Usuário
        db.run(`CREATE TABLE IF NOT EXISTS affective_memories (
      id TEXT PRIMARY KEY,
      preference_key TEXT UNIQUE,
      preference_value TEXT,
      emotional_context TEXT,
      lastUpdated INTEGER
    )`);
        // Índices para Performance
        db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_updated ON chat_sessions(updatedAt DESC)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_memories_tier ON memories(tier)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(source_session_id)`);
        // Migrações dinâmicas para colunas novas
        db.run('ALTER TABLE memories ADD COLUMN type TEXT;', (err) => {
            if (err && !err.message.includes('duplicate column name')) logger.error('Erro migração type');
        });
        db.run('ALTER TABLE memories ADD COLUMN neural_map TEXT;', (err) => {
            if (err && !err.message.includes('duplicate column name')) logger.error('Erro migração neural_map');
        });
        logger.success('Esquema do banco de dados inicializado com sucesso.');
    });
};
const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
    });
});
const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});
const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});
module.exports = {
    initializeSchema,
    run,
    get,
    all
};

