# 🚀 AGENTS.md - Regras Específicas para Modo Code

## 🔍 Padrões Não Óbvios Descobertos

### 1. Sistema de Filtragem de Modelos NVIDIA

- **Filtro Inteligente**: [`nvidia.service.js:44-56`](backend/src/services/nvidia.service.js:44) remove automaticamente modelos de visão, embedding, rerank, CLIP, VLM e parse
- **Critério de Inclusão**: Apenas modelos que contêm "instruct" ou "chat" no ID
- **Exclusão Estrita**: Remove qualquer modelo com "vision", "embed", "rerank", "clip", "vlm", "parse" ou "reward"

### 2. Normalização de Nomes de Modelos

- **Gemini**: [`gemini.service.js:10-14`](backend/src/services/gemini.service.js:10) adiciona automaticamente prefixo "models/" se não presente
- **NVIDIA**: [`nvidia.service.js:13-19`](backend/src/services/nvidia.service.js:13) mantém IDs completos com prefixos (nvidia/, meta/, mistralai/)
- **API Inconsistente**: Alguns modelos NVIDIA exigem IDs completos para evitar erro 404

### 3. Sistema de Memória Multi-Nível

- **L1**: Sessões de chat (`chat_sessions` table) - [`db.service.js:22-29`](backend/src/services/db.service.js:22)
- **L2**: Conhecimento vetorizado (`memories` table) com tiers (ouro, prata, bronze) - [`db.service.js:32-42`](backend/src/services/db.service.js:32)
- **L3**: Contexto afetivo (`affective_memories` table) para preferências do usuário - [`db.service.js:45-51`](backend/src/services/db.service.js:45)

### 4. Chunking Inteligente de Embeddings

- **Limite Conservador**: [`embedding.service.js:18`](backend/src/services/embedding.service.js:18) usa 4000 caracteres para evitar erros de token
- **Mean Pooling**: [`embedding.service.js:34-46`](backend/src/services/embedding.service.js:34) agrega chunks automaticamente com média vetorial
- **Fallback Manual**: [`vortex.service.js:94-123`](backend/src/services/vortex.service.js:94) implementa similaridade de cosseno em JavaScript quando o rerank falha

### 5. Sistema de Rerank NVIDIA

- **Transformação de IDs**: [`embedding.service.js:58`](backend/src/services/embedding.service.js:58) substitui pontos por underscores na URL mas mantém no payload
- **Endpoint Específico**: Usa `https://ai.api.nvidia.com/v1/retrieval/{model}_reranking` em vez da API padrão

### 6. Framework C.A.R.A. (Contextualize, Analise, Recomende, Agente)

- **Injeção Automática**: [`context.service.js:6-27`](backend/src/services/context.service.js:6) constrói mensagens de sistema dinamicamente
- **Hierarquia de Verdade**: [`constitution.js:23-28`](backend/src/services/constitution.js:23) define prioridade: Constituição > L3 > Histórico > L2

### 7. Sistema de Destilação Vortex

- **Prompt Estruturado**: [`vortex.service.js:17-30`](backend/src/services/vortex.service.js:17) extrai JSON específico de históricos de chat
- **Classificação Automática**: Separa "constitution" (dados biográficos) de "knowledge" (conhecimentos técnicos)
- **Neural Mapping**: [`vortex.service.js:53-65`](backend/src/services/vortex.service.js:53) armazena hierarquia de assuntos em JSON

### 8. Timeouts e Retries Configurados

- **NVIDIA**: [`nvidia.service.js:9-10`](backend/src/services/nvidia.service.js:9) 30s timeout + 3 retries
- **Streaming**: [`server.js:81-87`](backend/src/server.js:81) timeout de 15s para primeira resposta
- **Chunk Size**: [`server.js:134`](backend/src/server.js:134) 120 caracteres para streaming

### 9. Sistema de Áudio em Tempo Real (Frontend)

- **Conversão PCM**: [`OliveVisionAssistant.tsx:25-37`](frontend/src/components/Chat/OliveVisionAssistant.tsx:25) float32 para base64 com normalização
- **Sample Rate Fixo**: [`OliveVisionAssistant.tsx:159`](frontend/src/components/Chat/OliveVisionAssistant.tsx:159) 16kHz para compatibilidade com Gemini Live
- **Intervalo de Visão**: [`OliveVisionAssistant.tsx:204`](frontend/src/components/Chat/OliveVisionAssistant.tsx:204) captura frames a cada 1.5s

### 10. Migrações de Banco Dinâmicas

- **Schema Flexível**: [`db.service.js:59-64`](backend/src/services/db.service.js:59) adiciona colunas novas com tratamento de erro para duplicatas
- **Índices Otimizados**: [`db.service.js:54-56`](backend/src/services/db.service.js:54) índices para sessions updatedAt, memories tier e session_id

## ⚠️ Convenções Contra-intuitivas

1. **Modelos NVIDIA**: Alguns exigem IDs completos enquanto outros funcionam com nomes curtos
2. **Rerank API**: URL usa underscores mas payload mantém pontos no model ID
3. **Gemini Live**: Exige sample rate fixo de 16kHz e formatação PCM específica
4. **Embedding Chunks**: O sistema quebra automaticamente textos >4000 chars mas isso pode afetar qualidade semântica
5. **SQLite Schema**: Migrações dinâmicas permitem adicionar colunas mas podem falhar silenciosamente

## 🎯 Padrões de Nomenclatura Específicos

- **Services**: `*.service.js` (nvidia.service.js, memory.service.js)
- **Utils**: `*.js` (logger.js) - sem sufixo
- **Frontend Components**: PascalCase (OliveVisionAssistant.tsx)
- **Database IDs**: Prefixos específicos (`mem_`, `aff_`, `vtx_`)

---

_Documentação gerada através de análise automatizada do código. Atualizar conforme evolução do projeto._
