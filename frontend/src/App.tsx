import { useEffect, useRef, useState } from "react";

import {
  ChatMessage,
  type ChatAttachment,
} from "./components/Chat/ChatMessage";

import { OliveVisionAssistant } from "./components/Chat/OliveVisionAssistant";

import { VortexDistillModal } from "./components/Chat/VortexDistillModal";

import { MemoryDashboard } from "./components/Memory/MemoryDashboard";

import { Sidebar } from "./components/Sidebar/Sidebar";

import { api, type ChatAttachmentPayload } from "./services/api";

type SpeechRecognitionConstructor = new () => SpeechRecognition;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface Message {
  role: "user" | "assistant";

  content: string;

  model?: string;

  attachments?: ChatAttachment[];
}

interface Session {
  id: string;

  title: string;

  history?: string | Message[];

  model?: string;

  updatedAt: number;
}

type View = "chat" | "memory" | "olive";

const AUTO_MODEL_ID = "auto";
const DEFAULT_MODEL_ID = "default";

const ChatEmptyState = () => (
  <div className="w-full animate-in flex flex-col justify-center min-h-[50vh] text-center">
    <div className="flex flex-col items-center mb-8 md:mb-10">
      <div className="relative mb-4 group">
        <div className="absolute -inset-6 bg-primary/20 blur-[50px] rounded-full animate-pulse-slow"></div>

        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-linear-to-br from-primary to-indigo-600 shadow-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
          <svg
            className="w-8 h-8 md:w-10 md:h-10 text-white animate-float"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
      </div>

      <h2 className="text-4xl md:text-5xl font-black font-display mb-3 tracking-tight bg-linear-to-b from-white to-slate-500 bg-clip-text text-transparent">
        OLá, ADMINISTRADOR
      </h2>

      <p className="text-slate-400 text-base md:text-lg font-medium max-w-lg leading-relaxed">
        Sistemas prontos. Qual o próximo nível de evolução?
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-4 md:gap-5">
      <div className="glass-card rounded-4xl p-5 md:p-6 group hover:border-primary/30 transition-all flex flex-col justify-between h-full">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-lg shadow-primary/5">
            <svg
              className="w-5 h-5 md:w-6 md:h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>

          <h3 className="text-xl md:text-2xl font-black font-display text-white">
            Constituição
          </h3>
        </div>

        <ul className="space-y-2">
          {[
            "Lealdade absoluta ao Criador.",

            "Zero alucinações via RAG L3.",

            "Evolução por destilação contínua.",
          ].map((item, id) => (
            <li
              key={id}
              className="flex gap-3 text-xs md:text-sm text-slate-400 leading-snug font-medium"
            >
              <span className="text-primary font-black">0{id + 1}.</span>

              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass-card rounded-4xl p-5 md:p-6 group hover:border-accent/30 transition-all flex flex-col justify-between h-full">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all shadow-lg shadow-accent/5">
            <svg
              className="w-5 h-5 md:w-6 md:h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <h3 className="text-xl md:text-2xl font-black font-display text-white text-glow">
            Vortex Shield
          </h3>
        </div>

        <div className="space-y-3">
          <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
            Privacidade protegida por criptografia de ponta e processamento
            local.
          </p>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>

            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Vetorização L2 Ativa
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

function App() {
  const [messages, setMessages] = useState<Message[]>([]);

  const [input, setInput] = useState("");

  const [models, setModels] = useState<string[]>([]);

  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);

  const [isLoading, setIsLoading] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);

  const [activeSession, setActiveSession] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<View>("chat");

  const [showVortexModal, setShowVortexModal] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingAttachments, setPendingAttachments] = useState<
    ChatAttachment[]
  >([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const [isListening, setIsListening] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const viewOptions: { id: View; label: string }[] = [
    { id: "chat", label: "Inteligéncia" },

    { id: "olive", label: "Olive Vision" },

    { id: "memory", label: "Memória L2" },
  ];

  const modelOptions = [
    { id: AUTO_MODEL_ID, label: "Auto (Recomendado)" },
    { id: DEFAULT_MODEL_ID, label: "Default Recomendado" },
    ...models.map((modelId) => ({
      id: modelId,
      label:
        modelId.split("/").pop()?.toUpperCase().replace(/-/g, " ") || modelId,
    })),
  ];

  const getViewButtonClass = (viewId: View) => {
    const base =
      "px-5 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all";

    if (currentView === viewId) {
      const activeText =
        viewId === "chat"
          ? "text-primary"
          : viewId === "olive"
            ? "text-emerald-300"
            : "text-accent";

      return `${base} bg-white/10 ${activeText} shadow-sm`;
    }

    return `${base} text-slate-500 hover:text-slate-300`;
  };

  useEffect(() => {
    api.getModels().then((data) => {
      setModels(data.models || []);
    });

    // Busca sessões reais do banco de dados

    api.getSessions().then((data) => {
      if (Array.isArray(data)) {
        setSessions(data);
      }
    });
  }, []);

  useEffect(() => {
    if (currentView !== "chat") return;

    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentView]);

  const handleSelectSession = async (id: string) => {
    setActiveSession(id);

    setCurrentView("chat");

    const session = sessions.find((s) => s.id === id);

    if (session) {
      if (session.model) {
        setSelectedModel(session.model);
      }

      try {
        // Assume history is stored in the session object downloaded from getSessions

        // If it's not, we might need an api.getSession(id) call

        const history = session.history;

        if (history) {
          setMessages(
            typeof history === "string" ? JSON.parse(history) : history
          );
        }
      } catch (e) {
        console.error("Failed to parse session history", e);
      }
    }
  };

  const handleNewChat = () => {
    setMessages([]);

    setActiveSession(null);

    setPendingAttachments([]);

    setCurrentView("chat");
  };

  const serializeMessage = (message: Message) => {
    const base = message.content.trim();

    const attachmentSummary = (message.attachments || [])

      .map((att) => {
        const label =
          att.type === "image"
            ? "Imagem"
            : att.type === "audio"
              ? "Audio"
              : "Arquivo";
        return `- ${att.name} (${label}, ${Math.ceil(att.size / 1024)} KB)`;
      })

      .join("\n");

    if (!attachmentSummary) return base;

    return `${base}\n\nAnexos:\n${attachmentSummary}`.trim();
  };

  const readFileAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        const base64 = result.split(",")[1] || "";
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const sanitizeAttachments = (attachments?: ChatAttachment[]) => {
    if (!attachments) return undefined;
    return attachments.map((att) => ({
      id: att.id,
      name: att.name,
      size: att.size,
      type: att.type,
      mimeType: att.mimeType,
    }));
  };

  const buildAttachmentFromFile = (file: File) => {
    const mimeType = file.type || "application/octet-stream";
    const isImage = mimeType.startsWith("image/");
    const isAudio = mimeType.startsWith("audio/");
    return {
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
        .toString(16)
        .slice(2)}`,
      name: file.name,
      size: file.size,
      type: isImage ? "image" : isAudio ? "audio" : "file",
      mimeType,
      file,
      previewUrl: isImage ? URL.createObjectURL(file) : undefined,
    } as ChatAttachment;
  };

  const addAttachments = (files: File[]) => {
    const next = files.map((file) => buildAttachmentFromFile(file));

    setPendingAttachments((prev) => [...prev, ...next]);
  };

  const getSpeechRecognition = (): SpeechRecognitionConstructor | undefined => {
    return window.SpeechRecognition || window.webkitSpeechRecognition;
  };

  const startListening = () => {
    if (isListening) return;
    setRecordingError(null);
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setRecordingError("Reconhecimento de voz nao suportado.");
      return;
    }
    if (!recognitionRef.current) {
      recognitionRef.current = new Recognition();
    }
    const recognition = recognitionRef.current;
    finalTranscriptRef.current = input ? `${input.trim()} ` : "";
    recognition.lang = "pt-BR";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript || "";
        if (result.isFinal) {
          const current = finalTranscriptRef.current;
          finalTranscriptRef.current = `${current}${transcript.trim()} `;
        } else {
          interim += transcript;
        }
      }
      setInput(`${finalTranscriptRef.current}${interim}`.trimStart());
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Falha no reconhecimento:", event);
      setRecordingError("Falha no reconhecimento de voz.");
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setIsListening(false);
      return;
    }
    recognition.stop();
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(event.clipboardData?.items ?? []);

    const files = items

      .filter((item) => item.kind === "file")

      .map((item) => item.getAsFile())

      .filter(Boolean) as File[];

    if (files.length > 0) {
      event.preventDefault();

      addAttachments(files);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];

    if (files.length > 0) {
      addAttachments(files);
    }

    event.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((att) => att.id === id);

      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);

      return prev.filter((att) => att.id !== id);
    });
  };

  const handleSend = async (override?: { content?: string; attachments?: ChatAttachment[] }) => {
    const contentToSend = override?.content ?? input;
    const attachmentsToSend = override?.attachments ?? pendingAttachments;
    if ((!contentToSend.trim() && attachmentsToSend.length === 0) || isLoading) return;

    const userMsg: Message = {
      role: "user",
      content: contentToSend,
      attachments: attachmentsToSend,
    };

    const payloadAttachments = (
      await Promise.all(
        attachmentsToSend.map(async (att) => {
          if (!att.file) return null;
          const data = await readFileAsBase64(att.file);
          return {
            id: att.id,
            name: att.name,
            size: att.size,
            type: att.type,
            mimeType:
              att.mimeType || att.file.type || "application/octet-stream",
            data,
          } as ChatAttachmentPayload;
        })
      )
    ).filter(Boolean) as ChatAttachmentPayload[];

    const isUsingPending = !override?.attachments;
    if (isUsingPending) {
      pendingAttachments.forEach((att) => {
        if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
      });
    }

    setMessages((prev) => [...prev, userMsg]);

    setInput("");

    if (isUsingPending) {
      setPendingAttachments([]);
    }

    setIsLoading(true);

    let aiMsgContent = "";

    // Adiciona placeholder do assistente

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", model: selectedModel },
    ]);

    try {
      const streamMessages = [...messages, userMsg].map((msg) => ({
        role: msg.role,

        content: serializeMessage(msg),
      }));

      await api.chatStream(
        streamMessages,
        selectedModel,
        (chunk) => {
          aiMsgContent += chunk;

          setMessages((prev) => {
            const newMsgs = [...prev];

            if (newMsgs.length > 0) {
              newMsgs[newMsgs.length - 1].content = aiMsgContent;
            }

            return newMsgs;
          });
        },
        payloadAttachments
      );

      // Auto-Save: Salva a sessão após a resposta concluída

      const updatedHistory: Message[] = [
        ...messages,
        userMsg,
        {
          role: "assistant" as const,
          content: aiMsgContent,
          model: selectedModel,
        },
      ];
      const sanitizedHistory = updatedHistory.map((msg) => ({
        ...msg,
        attachments: sanitizeAttachments(msg.attachments),
      }));

      const sessionId = activeSession || `sn_${Date.now()}`;

      if (!activeSession) setActiveSession(sessionId);

      const title =
        userMsg.content.slice(0, 30) +
        (userMsg.content.length > 30 ? "..." : "");

      await api.saveSession({
        id: sessionId,

        title: activeSession
          ? sessions.find((s) => s.id === activeSession)?.title ?? title
          : title,

        history: sanitizedHistory,

        model: selectedModel,
      });

      // Atualiza lista de sessões localmente para refletir no sidebar

      api.getSessions().then((data) => {
        if (Array.isArray(data)) setSessions(data);
      });
    } catch (err) {
      const error = err as Error;

      console.error(error);

      setMessages((prev) => {
        const newMsgs = [...prev];

        if (newMsgs.length > 0) {
          newMsgs[newMsgs.length - 1].content = `Ops, Erro na Conexão: ${error.message || "Falha ao processar resposta."
            }`;
        }

        return newMsgs;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await api.deleteSession(id);

      setSessions((prev) => prev.filter((s) => s.id !== id));

      if (activeSession === id) handleNewChat();
    } catch (err) {
      console.error(err);
    }
  };

  const oliveContext = messages;

  return (
    <div className="flex h-screen w-full bg-surface overflow-hidden text-slate-100 font-sans selection:bg-primary/30">
      <Sidebar
        sessions={sessions}
        activeSession={activeSession}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main Content */}

      <div className="flex-1 flex flex-col relative overflow-hidden bg-linear-to-br from-surface to-slate-900/50">
        {/* Header */}

        <header className="h-20 glass border-b border-white/5 flex items-center justify-between px-10 z-30 transition-all duration-300">
          <div className="flex items-center gap-8">
            <div className="md:hidden text-xl font-black font-display tracking-tighter">
              SENTINNELL<span className="text-primary">PRO</span>
            </div>

            <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              {viewOptions.map((view) => (
                <button
                  key={view.id}
                  onClick={() => setCurrentView(view.id)}
                  className={getViewButtonClass(view.id)}
                >
                  {view.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setShowVortexModal(true)}
              className="group flex items-center gap-3 px-4 py-2 rounded-xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse ring-4 ring-red-500/20"></div>

              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/80 group-hover:text-red-500">
                Terminar
              </span>
            </button>

            <div className="h-8 w-px bg-white/5"></div>

            <div className="flex items-center gap-3">
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest opacity-50">
                Kernel:
              </div>

              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold font-display outline-none focus:border-primary/50 transition-all cursor-pointer hover:bg-white/10 appearance-none min-w-35"
              >
                {modelOptions.map((option) => (
                  <option
                    key={option.id}
                    value={option.id}
                    className="bg-surface"
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {currentView === "chat" ? (
          <>
            {/* Chat Area */}

            <main
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth custom-scrollbar"
            >
              <div className="max-w-300 2xl:max-w-375 mx-auto space-y-10">
                {messages.length === 0 && <ChatEmptyState />}

                {messages.map((msg, i) => (
                  <ChatMessage
                    key={i}
                    role={msg.role}
                    content={msg.content}
                    isLast={i === messages.length - 1}
                    model={msg.model}
                    attachments={msg.attachments}
                  />
                ))}
              </div>
            </main>

            {/* Footer / Input Area */}

            <footer className="p-10 z-30 relative py-12">
              <div className="max-w-300 2xl:max-w-375 mx-auto relative group">
                <div className="absolute -inset-1 bg-linear-to-r from-primary/50 to-accent/50 rounded-4xl opacity-0 group-focus-within:opacity-30 blur-2xl transition-all duration-500"></div>

                <div className="relative bg-slate-800/80 border border-white/10 shadow-2xl rounded-3xl p-3 flex items-end gap-3 backdrop-blur-2xl ring-1 ring-white/5">
                  <div className="flex-1">
                    {pendingAttachments.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {pendingAttachments.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-200"
                          >
                            <span className="truncate max-w-35">
                              {att.name}
                            </span>

                            <button
                              onClick={() => removeAttachment(att.id)}
                              className="text-slate-500 hover:text-red-400"
                              aria-label="Remover anexo"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {recordingError && (
                      <div className="mb-3 text-xs text-red-400">
                        {recordingError}
                      </div>
                    )}

                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        (e.preventDefault(), handleSend())
                      }
                      onPaste={handlePaste}
                      placeholder="Qual o próximo nível de evolução para o projeto hoje?"
                      className="w-full bg-transparent border-none p-5 pb-5 pr-16 outline-none resize-none h-16 min-h-16 max-h-48 text-[15px] leading-relaxed font-sans placeholder:text-slate-400 text-white selection:bg-primary"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-1 pt-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white/5 text-slate-200 w-12 h-12 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center"
                      title="Anexar arquivo"
                      aria-label="Anexar arquivo"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828a4 4 0 10-5.656-5.656L5.757 10.172a6 6 0 108.486 8.486L20 12"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={toggleListening}
                      className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center ${isListening
                          ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                          : "bg-white/5 text-slate-200 hover:bg-white/10"
                        }`}
                      title={isListening ? "Parar transcricao" : "Transcrever voz"}
                      aria-label={isListening ? "Parar transcricao" : "Transcrever voz"}
                    >
                      {isListening ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 6h12v12H6z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 1a4 4 0 00-4 4v7a4 4 0 008 0V5a4 4 0 00-4-4z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 10v2a7 7 0 01-14 0v-2"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 19v4"
                          />
                        </svg>
                      )}
                    </button>

                    <button
                      onClick={() => handleSend()}
                      disabled={
                        isLoading ||
                        (!input.trim() && pendingAttachments.length === 0)
                      }
                      className="bg-primary text-white w-14 h-14 rounded-2xl disabled:opacity-30 hover:scale-110 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center group/btn"
                    >
                      <svg
                        className="w-6 h-6 group-hover/btn:rotate-12 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </footer>
          </>
        ) : currentView === "olive" ? (
          <main className="flex-1">
            <OliveVisionAssistant contextHistory={oliveContext} />
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto custom-scrollbar">
            <MemoryDashboard />
          </main>
        )}
      </div>

      {showVortexModal && (
        <VortexDistillModal
          sessionId={activeSession || "temp"}
          history={messages}
          onClose={() => setShowVortexModal(false)}
          onComplete={() => {
            setShowVortexModal(false);

            setMessages([]);

            setCurrentView("memory");
          }}
        />
      )}
    </div>
  );
}

export default App;
