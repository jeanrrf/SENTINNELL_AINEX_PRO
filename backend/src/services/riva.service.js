// SENTINNELL_PRO/backend/src/services/riva.service.js

const path = require('path');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const config = require('../config');
const logger = require('../utils/logger');

const PROTO_ROOT = path.join(__dirname, '..', 'proto');
const ASR_PROTO = path.join(PROTO_ROOT, 'riva', 'proto', 'riva_asr.proto');
const TTS_PROTO = path.join(PROTO_ROOT, 'riva', 'proto', 'riva_tts.proto');

const PROTO_OPTIONS = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_ROOT]
};

let asrClient = null;
let ttsClient = null;
const ttsConfigCache = { expiresAt: 0, config: null };
const TTS_CONFIG_TTL_MS = 10 * 60 * 1000;

function getAuthMetadata(functionId) {
    const metadata = new grpc.Metadata();
    const apiKey = config.riva.apiKey || config.nvidia.apiKey;
    if (!apiKey) return metadata;
    metadata.add('authorization', `Bearer ${apiKey}`);
    if (functionId) metadata.add('function-id', functionId);
    return metadata;
}

function loadProto(protoPath) {
    const definition = protoLoader.loadSync(protoPath, PROTO_OPTIONS);
    return grpc.loadPackageDefinition(definition);
}

function getAsrClient() {
    if (asrClient) return asrClient;
    const proto = loadProto(ASR_PROTO);
    const service = proto?.nvidia?.riva?.asr?.RivaSpeechRecognition;
    if (!service) throw new Error('asr_proto_load_failed');
    asrClient = new service(
        config.riva.asrGrpcEndpoint,
        grpc.credentials.createSsl()
    );
    return asrClient;
}

function getTtsClient() {
    if (ttsClient) return ttsClient;
    const proto = loadProto(TTS_PROTO);
    const service = proto?.nvidia?.riva?.tts?.RivaSpeechSynthesis;
    if (!service) throw new Error('tts_proto_load_failed');
    ttsClient = new service(
        config.riva.ttsGrpcEndpoint,
        grpc.credentials.createSsl()
    );
    return ttsClient;
}

function extractTtsConfig(response) {
    const entries = response?.model_config || [];
    const voices = new Set();
    const languages = new Set();
    const subvoices = new Map();
    let defaultVoice = '';
    for (const entry of entries) {
        const params = entry?.parameters || {};
        if (!defaultVoice && params.voice_name) {
            defaultVoice = String(params.voice_name || '').trim();
            if (defaultVoice) voices.add(defaultVoice);
        }
        const languageValue = params.language_code || params.language_codes || '';
        const languageTokens = String(languageValue || '')
            .split(/[,|;]/)
            .map(token => token.trim())
            .filter(Boolean);
        languageTokens.forEach(token => languages.add(token));
        for (const [key, rawValue] of Object.entries(params)) {
            const lowerKey = String(key).toLowerCase();
            if (!lowerKey.includes('voice')) continue;
            const value = String(rawValue || '').trim();
            if (!value) continue;
            let parsedValues = [];
            if (value.startsWith('[') && value.endsWith(']')) {
                try {
                    const parsed = JSON.parse(value);
                    if (Array.isArray(parsed)) parsedValues = parsed.map(item => String(item).trim());
                } catch (error) {
                    parsedValues = [];
                }
            }
            if (!parsedValues.length) {
                parsedValues = value.split(/[,|;]/).map(item => item.trim()).filter(Boolean);
            }
            parsedValues.forEach(item => voices.add(item));
        }
        const subvoiceValue = String(params.subvoices || '').trim();
        if (subvoiceValue) {
            subvoiceValue.split(',').map(item => item.trim()).filter(Boolean).forEach((item) => {
                const name = item.split(':')[0]?.trim();
                if (!name) return;
                const languagePrefix = name.split('.')[0]?.trim();
                if (languagePrefix) {
                    const key = languagePrefix.toLowerCase();
                    if (!subvoices.has(key)) subvoices.set(key, []);
                    subvoices.get(key).push(name);
                    languages.add(languagePrefix);
                    voices.add(name);
                }
            });
        }
    }
    return {
        defaultVoice,
        voices: Array.from(voices),
        languages: Array.from(languages),
        subvoices: Object.fromEntries(subvoices)
    };
}

async function getTtsConfig() {
    const now = Date.now();
    if (ttsConfigCache.config && ttsConfigCache.expiresAt > now) {
        return ttsConfigCache.config;
    }
    if (!config.riva.ttsFunctionId) return null;
    try {
        const client = getTtsClient();
        const metadata = getAuthMetadata(config.riva.ttsFunctionId);
        const response = await new Promise((resolve, reject) => {
            client.GetRivaSynthesisConfig({ model_name: '' }, metadata, (err, data) => {
                if (err) return reject(err);
                return resolve(data);
            });
        });
        const configData = extractTtsConfig(response);
        ttsConfigCache.config = configData;
        ttsConfigCache.expiresAt = now + TTS_CONFIG_TTL_MS;
        return configData;
    } catch (error) {
        logger.error(`Erro ao buscar vozes Riva TTS: ${error.message}`);
        return null;
    }
}

function readAscii(buffer, start, length) {
    return buffer.toString('ascii', start, start + length);
}

function parseWav(buffer) {
    if (!buffer || buffer.length < 12) return { error: 'wav_too_short' };
    const riff = readAscii(buffer, 0, 4);
    const wave = readAscii(buffer, 8, 12);
    if (riff !== 'RIFF' || wave !== 'WAVE') return { error: 'wav_invalid_header' };

    let offset = 12;
    let fmt = null;
    let dataOffset = null;
    let dataSize = null;

    while (offset + 8 <= buffer.length) {
        const chunkId = readAscii(buffer, offset, 4);
        const chunkSize = buffer.readUInt32LE(offset + 4);
        offset += 8;

        if (chunkId === 'fmt ') {
            fmt = {
                audioFormat: buffer.readUInt16LE(offset),
                numChannels: buffer.readUInt16LE(offset + 2),
                sampleRate: buffer.readUInt32LE(offset + 4),
                bitsPerSample: buffer.readUInt16LE(offset + 14)
            };
        } else if (chunkId === 'data') {
            dataOffset = offset;
            dataSize = chunkSize;
        }

        offset += chunkSize + (chunkSize % 2);
    }

    if (!fmt || dataOffset === null || dataSize === null) return { error: 'wav_missing_chunks' };
    return { ...fmt, data: buffer.slice(dataOffset, dataOffset + dataSize) };
}

function downmixToMono(int16Buffer, channels) {
    if (channels === 1) return int16Buffer;
    const frameCount = int16Buffer.length / (channels * 2);
    const output = Buffer.alloc(frameCount * 2);
    for (let i = 0; i < frameCount; i += 1) {
        let sum = 0;
        for (let ch = 0; ch < channels; ch += 1) {
            const idx = (i * channels + ch) * 2;
            sum += int16Buffer.readInt16LE(idx);
        }
        const avg = Math.round(sum / channels);
        output.writeInt16LE(avg, i * 2);
    }
    return output;
}

const FFMPEG_MIME_TYPES = new Set([
    'audio/mpeg',
    'audio/mp3',
    'audio/aac',
    'audio/x-aac',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/webm'
]);

function decodeWithFfmpeg(buffer, sampleRate) {
    return new Promise((resolve, reject) => {
        if (!ffmpegPath) return reject(new Error('ffmpeg_not_available'));
        const args = [
            '-hide_banner',
            '-loglevel',
            'error',
            '-i',
            'pipe:0',
            '-ac',
            '1',
            '-ar',
            String(sampleRate),
            '-f',
            'wav',
            'pipe:1'
        ];
        const child = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
        const stdout = [];
        const stderr = [];
        child.stdout.on('data', (chunk) => stdout.push(chunk));
        child.stderr.on('data', (chunk) => stderr.push(chunk));
        child.on('error', (error) => reject(error));
        child.on('close', (code) => {
            if (code !== 0) {
                const message = Buffer.concat(stderr).toString('utf8').trim();
                return reject(new Error(message || `ffmpeg_exit_${code}`));
            }
            return resolve(Buffer.concat(stdout));
        });
        child.stdin.end(buffer);
    });
}

async function normalizeAudio(attachment) {
    const mimeType = String(attachment?.mimeType || '').toLowerCase();
    const buffer = Buffer.from(attachment?.data || '', 'base64');

    if (mimeType === 'audio/wav' || mimeType === 'audio/wave' || mimeType === 'audio/x-wav') {
        const wav = parseWav(buffer);
        if (wav.error) return { error: wav.error };
        if (wav.audioFormat !== 1 || wav.bitsPerSample !== 16) {
            return { error: 'wav_unsupported_format' };
        }
        const mono = downmixToMono(wav.data, wav.numChannels);
        return {
            audioBuffer: mono,
            encoding: 'LINEAR_PCM',
            sampleRate: wav.sampleRate,
            channelCount: 1
        };
    }

    if (mimeType === 'audio/ogg' || mimeType === 'audio/opus') {
        return {
            audioBuffer: buffer,
            encoding: 'OGGOPUS',
            sampleRate: config.riva.asrSampleRateHz || 16000,
            channelCount: 1
        };
    }

    if (mimeType === 'audio/flac') {
        return {
            audioBuffer: buffer,
            encoding: 'FLAC',
            sampleRate: config.riva.asrSampleRateHz || 16000,
            channelCount: 1
        };
    }

    if (FFMPEG_MIME_TYPES.has(mimeType)) {
        const targetSampleRate = config.riva.asrSampleRateHz || 16000;
        if (!ffmpegPath) return { error: 'ffmpeg_not_available' };
        try {
            const wavBuffer = await decodeWithFfmpeg(buffer, targetSampleRate);
            const wav = parseWav(wavBuffer);
            if (wav.error) return { error: wav.error };
            if (wav.audioFormat !== 1 || wav.bitsPerSample !== 16) {
                return { error: 'wav_unsupported_format' };
            }
            const mono = downmixToMono(wav.data, wav.numChannels);
            return {
                audioBuffer: mono,
                encoding: 'LINEAR_PCM',
                sampleRate: wav.sampleRate,
                channelCount: 1
            };
        } catch (error) {
            return { error: error.message || 'ffmpeg_decode_failed' };
        }
    }

    return { error: 'audio_unsupported_format' };
}

async function transcribeAudio(attachment) {
    if (!config.riva.asrFunctionId) {
        return { text: '', error: 'asr_not_configured' };
    }

    try {
        const audio = await normalizeAudio(attachment);
        if (audio.error) return { text: '', error: audio.error };

        const request = {
            config: {
                encoding: audio.encoding,
                sample_rate_hertz: audio.sampleRate,
                language_code: config.riva.asrLanguageCode,
                audio_channel_count: audio.channelCount
            },
            audio: audio.audioBuffer
        };

        const client = getAsrClient();
        const metadata = getAuthMetadata(config.riva.asrFunctionId);

        const response = await new Promise((resolve, reject) => {
            client.Recognize(request, metadata, (err, data) => {
                if (err) return reject(err);
                return resolve(data);
            });
        });

        const results = response?.results || [];
        const transcripts = results
            .map((result) => result.alternatives?.[0]?.transcript || '')
            .filter(Boolean);

        return { text: transcripts.join('\n'), error: null };
    } catch (error) {
        logger.error(`Erro no Riva ASR: ${error.message}`);
        return { text: '', error: error.message };
    }
}

function createWavBuffer(pcmBuffer, sampleRate, numChannels = 1, bitsPerSample = 16) {
    const blockAlign = numChannels * (bitsPerSample / 8);
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmBuffer.length;
    const totalSize = 44 + dataSize;
    const buffer = Buffer.alloc(totalSize);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(totalSize - 8, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    pcmBuffer.copy(buffer, 44);

    return buffer;
}

async function synthesizeSpeech(text, overrides = {}) {
    if (!config.riva.ttsFunctionId) {
        return { audioBase64: '', mimeType: '', error: 'tts_not_configured' };
    }

    if (!text || !text.trim()) {
        return { audioBase64: '', mimeType: '', error: 'tts_empty_text' };
    }

    try {
        const sampleRate = overrides.sampleRateHz || config.riva.ttsSampleRateHz || 22050;
        let voiceName = overrides.voiceName || config.riva.ttsVoice || '';
        let languageCode = overrides.languageCode || config.riva.ttsLanguageCode;
        let warning = null;
        const configData = await getTtsConfig();
        if (!voiceName) {
            voiceName = configData?.defaultVoice || configData?.voices?.[0] || '';
        }
        if (configData?.languages?.length) {
            const requested = languageCode;
            const normalizedRequested = String(languageCode || '').toLowerCase();
            const exactMatch = configData.languages.find(lang => lang.toLowerCase() === normalizedRequested);
            if (exactMatch) {
                languageCode = exactMatch;
            } else if (normalizedRequested) {
                const base = normalizedRequested.split('-')[0];
                const baseMatch = configData.languages.find(lang => lang.toLowerCase().startsWith(`${base}-`));
                if (baseMatch) {
                    languageCode = baseMatch;
                    warning = `tts_language_fallback:${requested}->${languageCode}`;
                } else {
                    languageCode = configData.languages[0];
                    warning = `tts_language_fallback:${requested || 'unset'}->${languageCode}`;
                }
            } else {
                languageCode = configData.languages[0];
            }
        }
        if (!voiceName) {
            return { audioBase64: '', mimeType: '', error: 'tts_voice_not_found', warning };
        }

        const request = {
            text,
            language_code: languageCode,
            encoding: 'LINEAR_PCM',
            sample_rate_hz: sampleRate,
            voice_name: voiceName
        };

        const client = getTtsClient();
        const metadata = getAuthMetadata(config.riva.ttsFunctionId);

        const response = await new Promise((resolve, reject) => {
            client.Synthesize(request, metadata, (err, data) => {
                if (err) return reject(err);
                return resolve(data);
            });
        });

        const audioBuffer = response?.audio || Buffer.alloc(0);
        const wavBuffer = createWavBuffer(Buffer.from(audioBuffer), sampleRate, 1, 16);

        return {
            audioBase64: wavBuffer.toString('base64'),
            mimeType: 'audio/wav',
            error: null,
            warning
        };
    } catch (error) {
        logger.error(`Erro no Riva TTS: ${error.message}`);
        return { audioBase64: '', mimeType: '', error: error.message };
    }
}

module.exports = {
    transcribeAudio,
    synthesizeSpeech
};

