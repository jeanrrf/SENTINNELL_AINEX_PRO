// SENTINNELL_PRO/backend/src/services/gemini-tts.service.js

const config = require('../config');
const logger = require('../utils/logger');

async function synthesizeSpeech(text, options = {}) {
    if (!config.google.apiKey) {
        return { audioBase64: '', mimeType: '', error: 'gemini_api_key_missing' };
    }

    if (!text || !text.trim()) {
        return { audioBase64: '', mimeType: '', error: 'tts_empty_text' };
    }

    const model = options.model || config.google.ttsModel;
    if (!model) {
        return { audioBase64: '', mimeType: '', error: 'gemini_tts_model_missing' };
    }

    const url = `${config.google.baseURL}/models/${model}:generateContent?key=${config.google.apiKey}`;
    const voiceName = options.voiceName || config.google.ttsVoice || 'Kore';
    const languageCode = options.languageCode || config.google.ttsLanguageCode || 'pt-BR';

    const body = {
        systemInstruction: {
            role: 'system',
            parts: [{ text: `Idioma: ${languageCode}. Sotaque brasileiro.` }]
        },
        contents: [
            {
                role: 'user',
                parts: [{ text }]
            }
        ],
        responseModalities: ['AUDIO'],
        voiceConfig: {
            prebuiltVoiceConfig: {
                voiceName
            }
        }
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Gemini TTS ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        const audioPart = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data && p.inlineData?.mimeType?.startsWith('audio/'));

        if (!audioPart?.inlineData?.data) {
            return { audioBase64: '', mimeType: '', error: 'gemini_tts_no_audio' };
        }

        return {
            audioBase64: audioPart.inlineData.data,
            mimeType: audioPart.inlineData.mimeType || 'audio/wav',
            error: null
        };
    } catch (error) {
        logger.error(`Erro no Gemini TTS: ${error.message}`);
        return { audioBase64: '', mimeType: '', error: error.message };
    }
}

module.exports = {
    synthesizeSpeech
};

