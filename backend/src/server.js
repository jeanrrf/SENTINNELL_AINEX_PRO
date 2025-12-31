// SENTINNELL_PRO/backend/src/server.js
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const config = require('./config');
const logger = require('./utils/logger');
const db = require('./services/db.service');
const modelRouter = require('./services/model-router.service');
const registry = require('./services/capability-registry.service');
const riva = require('./services/riva.service');
const geminiTts = require('./services/gemini-tts.service');
const memory = require('./services/memory.service');
const vortex = require('./services/vortex.service');
const { buildSystemMessage } = require('./services/context.service');
const { dialogCompletion } = require('./services/gemini.service');
const app = express();
// --- Utilitário para liberar a porta 3001 antes de iniciar ---
if (process.env.NODE_ENV !== 'production') {
    const { execSync } = require('child_process');
    try {
        // Tenta encontrar e matar o processo na porta 3001 (Windows)
        execSync(`npx kill-port ${config.port}`);
    } catch (e) {
        // Ignora se a porta já estiver livre
    }
}
// Middlewares
app.use(cors(config.cors));
app.use(compression());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
// Inicializar Banco
db.initializeSchema();
// --- Rotas API ---
// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'active', version: '4.0.0-PRO' });
});
// Listar Modelos NVIDIA
app.get('/api/models', async (req, res) => {
    try {
        const catalog = await registry.getCatalog();
        res.json({
            source: catalog.source,
            models: catalog.models
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/models/recommended', (req, res) => {
    const blueprint = registry.getBlueprint();
    res.json({
        chatDefault: blueprint.chatDefault,
        hardTask: blueprint.hardTask,
        vision: blueprint.vision,
        multimodal: blueprint.multimodal,
        docParse: blueprint.docParse,
        ocr: blueprint.ocr,
        safety: blueprint.safety,
        embed: blueprint.embed,
        rerank: blueprint.rerank
    });
});
app.get('/api/live/models', (req, res) => {
    const available = (config.google?.availableModels ?? []).length
        ? config.google.availableModels
        : [config.google?.defaultModel].filter(Boolean);
    res.json({ models: available });
});
// Chat Stream
app.post('/api/chat/stream', async (req, res) => {
    try {
        const { messages = [], model, attachments = [] } = req.body;
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        if (typeof res.flushHeaders === 'function') res.flushHeaders();
        const startTime = Date.now();
        // --- VORTEX SHIELD + WEB + REASONING ---
        const systemContent = await buildSystemMessage(messages);
        const enhancedMessages = [{ role: 'system', content: systemContent }, ...messages];
        const routing = await modelRouter.routeTurn({
            messages: enhancedMessages,
            model,
            attachments
        });
        const { stream, modelId, attempts } = await modelRouter.createChatStream(
            routing.preparedMessages,
            routing.chatModel,
            routing.fallbackModels
        );
        const trace = {
            ...routing.trace,
            selectedModel: modelId,
            fallbackChain: routing.fallbackModels,
            attempts,
            latencyMs: {},
            toolCalls: []
        };

        // Enviar informações do modelo no início do stream
        const modelInfo = {
            modelId,
            isDefaultModel: routing.isDefaultModel,
            routerReason: routing.trace.routerReason,
            routingTags: routing.trace.routingTags,
            usedModels: routing.trace.usedModels
        };
        res.write(`data: ${JSON.stringify({ modelInfo })}\n\n`);
        const abortStream = () => {
            if (stream && typeof stream.abort === 'function') stream.abort();
            if (stream?.controller && typeof stream.controller.abort === 'function') stream.controller.abort();
            if (typeof stream?.return === 'function') stream.return();
        };
        let firstTokenReceived = false;
        // Timeout de segurança: Se em 15 segundos não recebermos nada do stream, abortamos
        const streamTimeout = setTimeout(() => {
            if (!firstTokenReceived) {
                logger.error(`[TIMEOUT] Modelo ${modelId} demorou mais de 15s para responder.`);
                abortStream();
                res.write(`data: ${JSON.stringify({ error: 'A conexão com a IA expirou. Tente novamente.' })}\n\n`);
                res.end();
            }
        }, 15000);
        try {
            for await (const chunk of stream) {
                if (res.writableEnded) break;
                if (!firstTokenReceived) {
                    clearTimeout(streamTimeout);
                    const ttft = Date.now() - startTime;
                    logger.info(`[PERF] TTFT: ${ttft}ms (${modelId})`);
                    trace.latencyMs.ttft = ttft;
                    firstTokenReceived = true;
                }
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    res.write(`data: ${JSON.stringify({ content })}\n\n`);
                }
            }
            res.write('data: [DONE]\n\n');
            trace.latencyMs.total = Date.now() - startTime;
        } catch (streamErr) {
            clearTimeout(streamTimeout);
            throw streamErr;
        } finally {
            logger.info(`[ROUTER_TRACE] ${JSON.stringify(trace)}`);
            res.end();
        }
    } catch (err) {
        logger.error(`Erro no chat stream: ${err.message}`);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
    }
});
app.post('/api/live/dialog', async (req, res) => {
    try {
        const { messages = [], model } = req.body;
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        if (typeof res.flushHeaders === 'function') res.flushHeaders();
        // Centralizado: Vortex + Web + Protocols
        const systemContent = await buildSystemMessage(messages);
        const dialogMessages = [{ role: 'system', content: systemContent }, ...messages];
        const selectedModel = model || (config.google ? config.google.defaultModel : 'gemini-1.5-flash');
        logger.info(`[LIVE DIALOG] Chamando ${selectedModel}`);
        const aiResponse = await dialogCompletion(dialogMessages, selectedModel);
        const sanitizedResponse = (aiResponse?.trim() || 'Sem resposta gerada pelo Dialog').replace(/\r?\n/g, ' ');
        const chunkSize = 120;
        for (let i = 0; i < sanitizedResponse.length; i += chunkSize) {
            const chunk = sanitizedResponse.slice(i, i + chunkSize);
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }
        res.write('data: [DONE]\n\n');
    } catch (err) {
        logger.error(`Erro no live dialog: ${err.message}`);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    } finally {
        res.end();
    }
});
// TTS (Gemini primário, Riva fallback)
app.post('/api/tts', async (req, res) => {
    try {
        const { text, voiceName, languageCode, sampleRateHz } = req.body || {};
        let result = await geminiTts.synthesizeSpeech(text, {
            voiceName,
            languageCode
        });
        if (result.error) {
            logger.warn(`Gemini TTS falhou (${result.error}), tentando Riva...`);
            result = await riva.synthesizeSpeech(text, {
                voiceName,
                languageCode,
                sampleRateHz
            });
        }
        if (result.error) {
            res.status(400).json({ error: result.error, warning: result.warning });
            return;
        }
        res.json({ audioBase64: result.audioBase64, mimeType: result.mimeType, warning: result.warning });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ASR (Riva)
app.post('/api/asr', async (req, res) => {
    try {
        const { audio } = req.body || {};
        if (!audio?.data) {
            res.status(400).json({ error: 'audio_missing' });
            return;
        }
        const result = await riva.transcribeAudio(audio);
        if (result.error) {
            res.status(400).json({ error: result.error });
            return;
        }
        res.json({ text: result.text || '' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Rotas de Sessão (Exemplo) ---
app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await db.all('SELECT * FROM chat_sessions ORDER BY updatedAt DESC');
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/sessions', async (req, res) => {
    try {
        const { id, title, history, model } = req.body;
        const now = Date.now();
        await db.run(
            `INSERT OR REPLACE INTO chat_sessions (id, title, history, model, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?)`,
            [id, title, JSON.stringify(history || []), model, now, now]
        );
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/sessions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'SessionId obrigatA3rio' });
        await db.run('DELETE FROM chat_sessions WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Rotas de Memória L2 ---
app.get('/api/memories', async (req, res) => {
    try {
        const memories = await db.all('SELECT * FROM memories ORDER BY createdAt DESC');
        res.json(memories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/memories', async (req, res) => {
    try {
        const { content, tier, tags, sessionId, type, neuralMap } = req.body;
        const id = await memory.saveKnowledge(content, tier, tags, sessionId, type, neuralMap);
        res.status(201).json({ id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Rotas de Memória L3 (Afetiva) ---
app.get('/api/affective-context', async (req, res) => {
    try {
        const context = await memory.getSystemContext();
        res.json(context);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/affective-context', async (req, res) => {
    try {
        const { key, value, context } = req.body;
        await memory.updateAffectiveMemory(key, value, context);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Rotas VORTEX (Elite) ---
app.post('/api/vortex/distill', async (req, res) => {
    try {
        const { sessionId, history } = req.body;
        if (!sessionId || !history) return res.status(400).json({ error: 'SessionId e History são obrigatórios' });
        const result = await vortex.distillAndSave(sessionId, history);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/vortex/recall', async (req, res) => {
    try {
        const { q, type } = req.query;
        const results = await vortex.recall(q, type);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.use((err, req, res, next) => {
    if (err?.type === 'entity.too.large') {
        res.status(413).json({ error: 'payload_too_large' });
        return;
    }
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        res.status(400).json({ error: 'invalid_json' });
        return;
    }
    next(err);
});
// Iniciar Servidor
app.listen(config.port, () => {
    logger.success(`🚀 SENTINNELL PRO Backend rodando na porta ${config.port}`);
});
