import {
  GoogleGenAI,
  LiveServerMessage,
  MediaResolution,
  Modality,
  Session,
} from "@google/genai";

import { useCallback, useMemo, useRef, useState } from "react";

type ConnectionState = "IDLE" | "CONNECTING" | "CONNECTED" | "ERROR" | "CLOSED";

type VisionSource = "OFF" | "CAMERA" | "SCREEN";

interface TranscriptEntry {
  speaker: "user" | "model";

  text: string;
}

interface OliveVisionAssistantProps {
  contextHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

const SYSTEM_INSTRUCTION = `
Você é o Olive Vision, o módulo de percepção visual avançada do SENTINNELL PRO.

- Responda SEMPRE em Portugues Brasileiro (pt-BR).
- Nao descreva seu processo interno nem use "protocol response".
- Nao escreva em ingles. Responda somente com a resposta final.
- Seja tecnico, preciso e mantenha um tom de IA de elite.
- Responda de forma concisa, direta e objetiva.
- Vocativo preferencial: "Administrador" ou "Comandante".
`;

const SEND_SAMPLE_RATE = 16000;
const AUDIO_CHUNK_SIZE = 1024;

function float32ToBase64(buffer: Float32Array) {
  const int16 = new Int16Array(buffer.length);

  for (let i = 0; i < buffer.length; i++) {
    const sample = Math.max(-1, Math.min(1, buffer[i]));

    int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  const bytes = new Uint8Array(int16.buffer);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export const OliveVisionAssistant = ({
  contextHistory = [],
}: OliveVisionAssistantProps) => {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("IDLE");

  const [visionSource, setVisionSource] = useState<VisionSource>("OFF");

  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);

  const [error, setError] = useState<string | null>(null);

  // Refs

  const client = useRef<GoogleGenAI | null>(null);

  const liveSession = useRef<Session | null>(null);

  const audioContext = useRef<AudioContext | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const visionInterval = useRef<number | null>(null);

  const fullContext = useMemo(() => {
    return contextHistory
      .map((h) => `${h.role === "user" ? "Usuário" : "IA"}: ${h.content}`)
      .join("\n");
  }, [contextHistory]);

  const extractModelText = useCallback((parts?: Array<{ text?: string }>) => {
    if (!parts) return "";

    return parts
      .map((part) => part.text ?? "")
      .join("")
      .trim();
  }, []);

  const isMetaEnglish = useCallback((text: string) => {
    const lower = text.toLowerCase();
    if (
      lower.includes("protocol response") ||
      lower.includes("clarifying the greeting")
    )
      return true;
    if (
      lower.includes("responding to the user") ||
      lower.includes("i've registered")
    )
      return true;
    if (lower.includes("my primary focus") || lower.includes("i am focused"))
      return true;
    if (
      lower.includes("i am formulating") ||
      lower.includes("i am strategizing")
    )
      return true;
    if (
      lower.includes("i'm currently") ||
      lower.startsWith("i am") ||
      lower.startsWith("i'm ")
    )
      return true;
    if (
      lower.includes("i've processed") ||
      lower.includes("my primary directive")
    )
      return true;
    if (lower.includes("in portuguese")) return true;
    return false;
  }, []);

  const sanitizeOliveText = useCallback(
    (text: string) => {
      if (!text) return "";
      const lower = text.toLowerCase();
      const hasPortugueseCue =
        lower.includes("administrador") ||
        lower.includes("comandante") ||
        lower.includes("pronto") ||
        lower.includes("entendido") ||
        lower.includes("como posso");
      if (isMetaEnglish(text)) {
        return "Administrador, pronto. Envie o proximo comando.";
      }
      if (!hasPortugueseCue && /[a-z]/i.test(text) && /[.!?]/.test(text)) {
        return "Administrador, pronto. Envie o proximo comando.";
      }
      return text;
    },
    [isMetaEnglish]
  );

  const addTranscript = useCallback((text: string) => {
    if (!text) return;

    setTranscripts((prev) => [...prev, { speaker: "model", text }]);
  }, []);

  // --- Gerenciamento de Visão ---

  const stopVision = useCallback(() => {
    if (visionInterval.current) {
      window.clearInterval(visionInterval.current);

      visionInterval.current = null;
    }

    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());

      videoRef.current.srcObject = null;
    }

    setVisionSource("OFF");
  }, []);

  const startVision = useCallback(
    async (source: VisionSource) => {
      stopVision();

      try {
        const stream =
          source === "CAMERA"
            ? await navigator.mediaDevices.getUserMedia({
              video: { width: 1280, height: 720 },
            })
            : await navigator.mediaDevices.getDisplayMedia({ video: true });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          setVisionSource(source);
        }
      } catch (err) {
        console.error("Falha ao iniciar visão:", err);

        setError("Não foi possível acessar a câmera ou tela.");
      }
    },
    [stopVision]
  );

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;

    const video = videoRef.current;

    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    canvas.width = 640;

    canvas.height = 360;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.5).split(",")[1];
  }, []);

  const handleMessage = useCallback(
    (event: LiveServerMessage) => {
      const text = extractModelText(event.serverContent?.modelTurn?.parts);

      if (text) {
        const cleaned = sanitizeOliveText(text);
        if (cleaned) addTranscript(cleaned);
      }

      if (event.serverContent?.interrupted) {
        setError("Transmissão interrompida.");
      }
    },

    [addTranscript, extractModelText, sanitizeOliveText]
  );

  // --- Gerenciamento da Sessão ---

  const cleanup = useCallback(() => {
    stopVision();

    if (liveSession.current) {
      liveSession.current.close();

      liveSession.current = null;
    }

    if (audioContext.current) {
      audioContext.current.close();

      audioContext.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());

      streamRef.current = null;
    }

    if (client.current) {
      client.current = null;
    }

    setConnectionState("CLOSED");
  }, [stopVision]);

  const startSession = useCallback(async () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      setError("Chave API não configurada.");

      setConnectionState("ERROR");

      return;
    }

    setConnectionState("CONNECTING");

    cleanup();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      streamRef.current = stream;

      audioContext.current = new AudioContext({ sampleRate: SEND_SAMPLE_RATE });

      const source = audioContext.current.createMediaStreamSource(stream);

      const processor = audioContext.current.createScriptProcessor(
        AUDIO_CHUNK_SIZE,
        1,
        1
      );

      processor.onaudioprocess = (event) => {
        if (!liveSession.current) return;

        const chunk = event.inputBuffer.getChannelData(0);

        const base64 = float32ToBase64(chunk);

        liveSession.current.sendRealtimeInput({
          media: {
            data: base64,
            mimeType: `audio/pcm;rate=${SEND_SAMPLE_RATE}`,
          },
        });
      };

      source.connect(processor);

      processor.connect(audioContext.current.destination);

      client.current = new GoogleGenAI({ apiKey });

      const systemInstruction = `${SYSTEM_INSTRUCTION}\n\nIdioma: PT-BR.\n\nCONTEXTO ANTERIOR:\n${fullContext}`;

      const session = await client.current.live.connect({
        model:
          import.meta.env.VITE_GEMINI_LIVE_MODEL ||
          "gemini-2.5-flash-native-audio-preview-12-2025",

        config: {
          systemInstruction,

          responseModalities: [Modality.AUDIO],

          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
            languageCode: "pt-BR",
          },
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
          contextWindowCompression: {
            triggerTokens: "25600",
            slidingWindow: { targetTokens: "12800" },
          },

          inputAudioTranscription: {},

          outputAudioTranscription: {},
        },

        callbacks: {
          onopen: () => {
            setConnectionState("CONNECTED");

            if (liveSession.current) {
              liveSession.current.send({
                input:
                  "Responda sempre em Portugues Brasileiro. Nao use texto de processo interno. Responda apenas com a resposta final, curta e objetiva.",
                endOfTurn: true,
              });
            }
          },

          onmessage: handleMessage,

          onerror: (err: ErrorEvent) => {
            setError(err?.message || "Erro no Live Connect.");

            setConnectionState("ERROR");

            cleanup();
          },

          onclose: () => {
            setConnectionState("CLOSED");

            cleanup();
          },
        },
      });

      liveSession.current = session;

      visionInterval.current = window.setInterval(() => {
        if (!liveSession.current || visionSource === "OFF") return;

        const frame = captureFrame();

        if (frame) {
          liveSession.current.sendRealtimeInput({
            media: { data: frame, mimeType: "image/jpeg" },
          });
        }
      }, 1500);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Falha desconhecida no Hub Olive";

      setError(errorMsg);

      setConnectionState("ERROR");
    }
  }, [cleanup, captureFrame, fullContext, handleMessage, visionSource]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden p-4 md:p-8 gap-6">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div
              className={`w-4 h-4 rounded-full ${connectionState === "CONNECTED"
                  ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                  : "bg-red-500 animate-pulse"
                }`}
            ></div>
          </div>

          <div>
            <h1 className="text-xl font-black tracking-widest text-emerald-400">
              OLIVE VISION <span className="text-white/20">SUPREME</span>
            </h1>

            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-bold">
              {connectionState}
            </p>
          </div>
        </div>

        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
          <button
            onClick={() => startVision("CAMERA")}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${visionSource === "CAMERA"
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-500 hover:text-slate-300"
              }`}
          >
            Camera
          </button>

          <button
            onClick={() => startVision("SCREEN")}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${visionSource === "SCREEN"
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-500 hover:text-slate-300"
              }`}
          >
            Screen
          </button>

          <button
            onClick={stopVision}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${visionSource === "OFF"
                ? "bg-red-500/20 text-red-400"
                : "text-slate-500 hover:text-slate-300"
              }`}
          >
            Off
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* Visual Engine Container */}

        <div className="flex-3 relative bg-black rounded-[3rem] overflow-hidden border border-emerald-500/20 shadow-2xl group">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-1000"
          />

          <canvas ref={canvasRef} className="hidden" />

          {/* HUD Overlay */}

          <div className="absolute inset-x-0 top-0 p-8 flex justify-between pointer-events-none">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-black/60 px-3 py-1.5 rounded-lg border border-emerald-500/30 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                LIVE_STREAM: ACTIVE
              </div>

              <div className="text-[9px] font-mono text-slate-400 bg-black/60 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm">
                MODEL: GEMINI_2.0_FLASH
              </div>
            </div>

            <div className="text-[9px] font-mono text-slate-400 bg-black/60 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm">
              SENTINNELL_NODE_01
            </div>
          </div>

          {visionSource === "OFF" && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-3xl animate-in fade-in">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full border-2 border-dashed border-emerald-500/30 flex items-center justify-center text-emerald-500/30">
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>

                <p className="text-xs uppercase tracking-[0.5em] text-slate-500 font-black">
                  Waiting for Visual Input
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Intelligence Hub Sidebar */}

        <div className="flex-1 flex flex-col gap-6">
          <div className="flex-1 bg-white/5 rounded-[3rem] border border-white/10 p-8 flex flex-col overflow-hidden backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                Neural Log
              </h3>

              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar pr-2">
              {transcripts.length > 0 ? (
                transcripts.map((t, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${t.speaker === "user" ? "items-end" : "items-start"
                      } group animate-in slide-in-from-bottom-2`}
                  >
                    <span className="text-[8px] uppercase tracking-widest text-slate-500 mb-2 group-hover:text-emerald-400 transition-colors">
                      {t.speaker}
                    </span>

                    <div
                      className={`p-4 rounded-3xl text-[13px] leading-relaxed ${t.speaker === "user"
                          ? "bg-emerald-500/10 text-emerald-100 border border-emerald-500/20"
                          : "bg-slate-900/80 text-slate-200 border border-white/5 shadow-xl"
                        }`}
                    >
                      {t.text}
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20 grayscale">
                  <svg
                    className="w-12 h-12 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>

                  <p className="text-[10px] uppercase tracking-widest font-black">
                    Comm Link Idle
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={connectionState === "CONNECTED" ? cleanup : startSession}
              className={`mt-6 w-full py-6 rounded-2xl font-black uppercase tracking-[0.6em] text-[11px] transition-all duration-500 ${connectionState === "CONNECTED"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white"
                  : "bg-emerald-500 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                }`}
            >
              {connectionState === "CONNECTED"
                ? "Encerrar Link"
                : "Iniciar Link Neural"}
            </button>
          </div>

          <div className="bg-emerald-500/5 rounded-[2.5rem] border border-emerald-500/10 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>

              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60">
                  System Load
                </div>

                <div className="text-lg font-display font-black text-emerald-300">
                  0.002ms Latency
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-10 left-10 right-10 p-6 bg-red-500/10 border border-red-500/20 rounded-4xl text-red-200 text-[11px] font-mono backdrop-blur-3xl animate-in slide-in-from-bottom-10">
          <span className="text-red-500 font-black mr-4">
            CRITICAL_EXCEPTION:
          </span>{" "}
          {error}
        </div>
      )}
    </div>
  );
};

