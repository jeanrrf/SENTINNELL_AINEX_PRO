// SENTINNELL_PRO/backend/src/config/index.js
require('dotenv').config();
module.exports = {
    port: process.env.PORT || 3001,
    nvidia: {
        apiKey: process.env.NVIDIA_API_KEY,
        baseURL: 'https://integrate.api.nvidia.com/v1',
        defaultModel: process.env.NVIDIA_DEFAULT_TEXT_MODEL || 'meta/llama-3.3-70b-instruct',
        powerModel: process.env.NVIDIA_POWER_MODEL || 'meta/llama-3.3-70b-instruct',
        embeddingModel: process.env.NVIDIA_EMBEDDING_MODEL || 'nvidia/llama-3.2-nv-embedqa-1b-v2',
        rerankModel: process.env.NVIDIA_RERANK_MODEL || 'nvidia/llama-3.2-nemoretriever-500m-rerank-v2'
    },
    router: {
        autoModelId: 'auto',
        defaultRecommendedId: 'default',
        defaultTextModel: process.env.NVIDIA_DEFAULT_TEXT_MODEL || 'meta/llama-3.3-70b-instruct',
        fallbackTextModels: (process.env.NVIDIA_FALLBACK_TEXT_MODELS || '')
            .split(',')
            .map(model => model.trim())
            .filter(Boolean),
        visionModelId: process.env.NVIDIA_VISION_MODEL || 'meta/llama-3.2-90b-vision-instruct',
        multimodalOmniModelId: process.env.NVIDIA_MULTIMODAL_MODEL || 'microsoft/phi-4-multimodal-instruct',
        docParseModelId: process.env.NVIDIA_DOC_PARSE_MODEL || 'nvidia/nemotron-parse',
        ocrModelId: process.env.NVIDIA_OCR_MODEL || 'nvidia/ocdrnet',
        safetyGuardModelId: process.env.NVIDIA_SAFETY_GUARD_MODEL || 'nvidia/llama-3.1-nemotron-safety-guard-multilingual-8b-v1',
        hardTaskModels: (process.env.NVIDIA_HARD_TASK_MODELS ||
            'meta/llama-3.1-405b-instruct,nvidia/llama-3.1-nemotron-ultra-253b-v1,deepseek-ai/deepseek-r1-0528')
            .split(',')
            .map(model => model.trim())
            .filter(Boolean),
        hardTaskTriggers: (process.env.NVIDIA_HARD_TASK_TRIGGERS || '[hard_task],[hard-task],[hard]')
            .split(',')
            .map(token => token.trim())
            .filter(Boolean),
        enableMultimodal: process.env.ROUTER_ENABLE_MULTIMODAL === 'true',
        enableAsr: process.env.ROUTER_ENABLE_ASR !== 'false',
        enableDocParse: process.env.ROUTER_ENABLE_DOC_PARSE === 'true',
        asrProvider: process.env.ROUTER_ASR_PROVIDER || 'riva',
        modelsCacheTtlMs: parseInt(process.env.NVIDIA_MODELS_CACHE_TTL_MS || '600000', 10),
        maxRetries: parseInt(process.env.NVIDIA_ROUTER_MAX_RETRIES || '3', 10),
        retryBaseDelayMs: parseInt(process.env.NVIDIA_ROUTER_RETRY_BASE_DELAY_MS || '300', 10),
        retryMaxDelayMs: parseInt(process.env.NVIDIA_ROUTER_RETRY_MAX_DELAY_MS || '2000', 10),
        modelDenylist: (process.env.NVIDIA_MODEL_DENYLIST || 'mistral-675,video')
            .split(',')
            .map(token => token.trim())
            .filter(Boolean),
        fallbackCatalog: (process.env.NVIDIA_MODEL_FALLBACK_CATALOG ||
            'meta/llama-3.3-70b-instruct,meta/llama-3.2-90b-vision-instruct,microsoft/phi-4-multimodal-instruct,nvidia/nemotron-parse')
            .split(',')
            .map(model => model.trim())
            .filter(Boolean)
    },
    google: {
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        defaultModel: process.env.GOOGLE_DEFAULT_MODEL || 'gemini-1.5-pro',
        availableModels: (process.env.GOOGLE_AVAILABLE_MODELS || 'gemini-1.5-pro')
            .split(',')
            .map(model => model.trim())
            .filter(Boolean),
        ttsModel: process.env.GOOGLE_TTS_MODEL || 'gemini-2.5-flash-preview-tts',
        ttsVoice: process.env.GOOGLE_TTS_VOICE || 'Kore',
        ttsLanguageCode: process.env.GOOGLE_TTS_LANGUAGE_CODE || 'pt-BR',
        temperature: parseFloat(process.env.GOOGLE_TEMPERATURE || '0.25'),
        maxOutputTokens: parseInt(process.env.GOOGLE_MAX_OUTPUT_TOKENS || '1200', 10)
    },
    riva: {
        asrGrpcEndpoint: process.env.RIVA_ASR_GRPC_ENDPOINT || 'grpc.nvcf.nvidia.com:443',
        asrFunctionId: process.env.RIVA_ASR_FUNCTION_ID || '',
        asrLanguageCode: process.env.RIVA_ASR_LANGUAGE_CODE || 'pt-BR',
        asrSampleRateHz: parseInt(process.env.RIVA_ASR_SAMPLE_RATE_HZ || '16000', 10),
        ttsGrpcEndpoint: process.env.RIVA_TTS_GRPC_ENDPOINT || 'grpc.nvcf.nvidia.com:443',
        ttsFunctionId: process.env.RIVA_TTS_FUNCTION_ID || '',
        ttsLanguageCode: process.env.RIVA_TTS_LANGUAGE_CODE || 'pt-BR',
        ttsVoice: process.env.RIVA_TTS_VOICE || '',
        ttsSampleRateHz: parseInt(process.env.RIVA_TTS_SAMPLE_RATE_HZ || '22050', 10),
        apiKey: process.env.RIVA_API_KEY || ''
    },
    database: {
        path: './data/sentinnell.db'
    },
    cors: {
        origin: '*' // Simplificado para uso pessoal
    }
};
