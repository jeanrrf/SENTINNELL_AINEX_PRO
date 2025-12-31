// SENTINNELL_PRO/frontend/src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export interface ChatAttachmentPayload {
    id: string;
    name: string;
    size: number;
    type: 'image' | 'file' | 'audio';
    mimeType: string;
    data: string;
}

export interface ModelCatalogEntry {
    id: string;
    sizeB?: number | null;
    tags?: string[];
    recommended?: boolean;
    recommendedFor?: string[];
    isChat?: boolean;
    supportsVision?: boolean;
    supportsMultimodal?: boolean;
    isParse?: boolean;
    isOcr?: boolean;
    isSafety?: boolean;
    isEmbedding?: boolean;
    isRerank?: boolean;
    isVideo?: boolean;
}
export interface AsrPayload {
    name: string;
    size: number;
    mimeType: string;
    data: string;
}

export interface ModelInfo {
    modelId: string;
    isDefaultModel: boolean;
    routerReason: string;
    routingTags?: string[];
    usedModels?: Record<string, string>;
}

async function streamSse(response: Response, onChunk: (chunk: string) => void, onModelInfo?: (modelInfo: ModelInfo) => void) {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return;
    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundaryIndex = buffer.indexOf('\n\n');
        while (boundaryIndex !== -1) {
            const rawEvent = buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + 2);
            const lines = rawEvent.split('\n');
            for (const line of lines) {
                if (!line.startsWith('data:')) continue;
                const data = line.replace(/^data:\s?/, '');
                if (data === '[DONE]') return;
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        throw new Error(parsed.error);
                    }
                    if (parsed.modelInfo && onModelInfo) {
                        onModelInfo(parsed.modelInfo);
                    }
                    if (parsed.content) onChunk(parsed.content);
                } catch (error) {
                    console.error('Error parsing SSE data', error);
                    if (error instanceof Error) throw error;
                }
            }
            boundaryIndex = buffer.indexOf('\n\n');
        }
    }
}
export const api = {
    getHealth: async () => {
        const res = await fetch(`${API_BASE_URL}/health`);
        return res.json();
    },
    getModels: async () => {
        const res = await fetch(`${API_BASE_URL}/models`);
        return res.json();
    },
    chatStream: async (
        messages: ChatMessage[],
        model: string,
        onChunk: (chunk: string) => void,
        attachments: ChatAttachmentPayload[] = [],
        onModelInfo?: (modelInfo: ModelInfo) => void
    ) => {
        const response = await fetch(`${API_BASE_URL}/chat/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, model, attachments }),
        });
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(errorText || `HTTP ${response.status}`);
        }
        await streamSse(response, onChunk, onModelInfo);
    },
    distill: async (sessionId: string, history: ChatMessage[]) => {
        const response = await fetch(`${API_BASE_URL}/vortex/distill`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, history }),
        });
        return response.json();
    },
    getSessions: async () => {
        const res = await fetch(`${API_BASE_URL}/sessions`);
        return res.json();
    },
    saveSession: async (session: { id: string; title: string; history: ChatMessage[]; model: string }) => {
        const response = await fetch(`${API_BASE_URL}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(session),
        });
        return response.json();
    },
    deleteSession: async (sessionId: string) => {
        const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
            method: 'DELETE',
        });
        return response.json();
    },
    tts: async (text: string, voiceName?: string) => {
        const response = await fetch(`${API_BASE_URL}/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voiceName })
        });
        return response.json();
    },
    asr: async (audio: AsrPayload) => {
        const response = await fetch(`${API_BASE_URL}/asr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio })
        });
        return response.json();
    }
};

