# AGENTS.md - SENTINNELL PRO
## 🚀 Visão Geral do Projeto
**SENTINNELL PRO** é uma plataforma de inteligência artificial avançada com arquitetura monorepo que combina backend Node.js/Express com frontend React/TypeScript. O sistema implementa múltiplos níveis de memória cognitiva e integração com APIs de elite (NVIDIA, Google Gemini).
## 🛠 Stack Tecnológica
### Backend (`backend/`)
- **Runtime**: Node.js + Express
- **Banco de Dados**: SQLite com schema otimizado para memória cognitiva
- **APIs Integradas**: NVIDIA NIM API, Google Gemini API
- **Dependências Principais**:
  - `express@4.19.2` - Framework web
  - `sqlite3@5.1.7` - Banco embarcado
  - `openai@4.52.7` - Client NVIDIA API
  - `colorette@2.0.20` - Logging colorido
### Frontend (`frontend/`)
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite + Rolldown
- **Styling**: Tailwind CSS v4.1
- **APIs Client**: Google GenAI SDK
- **Dependências Principais**:
  - `@google/genai@1.34.0` - Client Gemini Live
  - `@tailwindcss/vite@4.1.18` - Tailwind integrado
  - `react@19.2.0` + `react-dom@19.2.0`
## 📋 Comandos de Desenvolvimento
### Backend
```bash
cd backend
npm start          # Produção
npm run dev       # Desenvolvimento com nodemon
npm run kill:port # Libera porta 3001
```
### Frontend
```bash
cd frontend
npm run dev       # Desenvolvimento
npm run Front     # Mata porta 5173 antes de iniciar o dev
npm run build     # Build de produção
npm run lint      # ESLint
npm run preview   # Preview de produção
```
### Scripts Utilitários
```bash
node scripts/sync-gemini-env.js # Sincroniza variáveis entre backend/frontend
```
## 🎯 Padrões de Código Específicos
### 1. Sistema de Memória Multi-Nível
- **L1**: Sessões de chat (`chat_sessions` table)
- **L2**: Conhecimento vetorizado (`memories` table com embeddings)
- **L3**: Contexto afetivo/preferências (`affective_memories` table)
### 2. Framework C.A.R.A.
Todas as respostas seguem o padrão:
- **C**ontextualize
- **A**nalise
- **R**ecomende
- **A**gente
### 3. Constituição AINEX
Leis prioritárias injetadas em todas as sessões:
- Identidade fixa como "AINEX"
- Lealdade absoluta ao criador "Jean"
- Idioma padrão Português Brasileiro
- Framework anti-alucinação
### 4. Padrões de Nomenclatura
- Services: `*.service.js` (nvidia.service.js, memory.service.js)
- Utils: `*.js` (logger.js)
- Config: `config/index.js`
- Frontend components: PascalCase (OliveVisionAssistant.tsx)
## 🔧 Configurações Não Óbvias
### Variáveis de Ambiente Críticas
```env
# Backend (.env)
NVIDIA_API_KEY=             # Chave API NVIDIA
GEMINI_API_KEY=            # Chave API Google Gemini
PORT=3001                 # Porta do backend
# Frontend (.env)
VITE_GEMINI_API_KEY=       # Sincronizada automaticamente
VITE_GEMINI_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-09-2025
```
### Configuração NVIDIA
```javascript
// backend/src/config/index.js
nvidia: {
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
  defaultModel: 'meta/llama-3.1-8b-instruct',
  powerModel: 'meta/llama-3.3-70b-instruct',      // Para destilação Vortex
  embeddingModel: 'nvidia/llama-3.2-nv-embedqa-1b-v2',
  rerankModel: 'nvidia/llama-3.2-nemoretriever-500m-rerank-v2'
}
```
### Sistema de Filtragem de Modelos
O projeto implementa filtragem inteligente para mostrar apenas modelos de chat/instruct, removendo:
- Modelos de visão (vision)
- Embedding models
- Rerank models
- CLIP/VLM/Parse models
## 🚨 Considerações de Performance
### 1. Timeouts Configurados
- NVIDIA API: 30s timeout + 3 retries
- Stream timeout: 15s para primeira resposta
- Chunk size: 120 caracteres para streaming
### 2. Otimizações de Embedding
- Chunking automático para textos > 4000 caracteres
- Mean pooling para agregação de chunks
- Fallback para similaridade de cosseno manual
### 3. Gerenciamento de Memória
- SQLite com índices otimizados
- Migrações dinâmicas de schema
- Compactação automática de histórico
## 🎨 Frontend Patterns
### Design System
- Glassmorphism com `backdrop-blur`
- Gradients sutis e borders translúcidos
- Animações `animate-in` personalizadas
- HUD estilo "elite AI"
### Component Architecture
- Separado por domínio (Chat, Memory, OliveVision)
- Hooks customizados para estado complexo
- SSR-ready com Vite
## 🔍 Troubleshooting Comum
### Erros de Conexão NVIDIA
1. Verificar `NVIDIA_API_KEY` no .env
2. Confirmar acesso à `integrate.api.nvidia.com`
3. Checar filtro de modelos (apenas chat/instruct)
### Problemas de Database
1. Pasta `backend/data/` deve ter permissões de escrita
2. Schema auto-inicializado na primeira execução
### Frontend Build Issues
1. Usar `npm run build` que combina `tsc -b && vite build`
2. Variáveis de ambiente devem ser sincronizadas via script
## 📊 Métricas de Saúde
### Endpoints de Monitoramento
- `GET /api/health` - Status da aplicação
- `GET /api/models` - Lista modelos disponíveis
- `GET /api/live/models` - Modelos Google disponíveis
### Logging Estruturado
- [INFO] - Operações normais
- [SUCCESS] - Conclusões bem-sucedidas
- [WARN] - Alertas não críticos
- [ERROR] - Erros com detalhes
- [DEBUG] - Debug detalhado
---
_Documentação gerada através de análise automatizada do códigobase. Atualizar conforme evolução do projeto._

