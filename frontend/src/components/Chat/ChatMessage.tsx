import React, { useState } from 'react';
import { api } from '../../services/api';
export interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  type: 'image' | 'file' | 'audio';
  previewUrl?: string;
  mimeType?: string;
  file?: File;
}
interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isLast?: boolean;
  model?: string;
  attachments?: ChatAttachment[];
  modelInfo?: {
    modelId: string;
    isDefaultModel: boolean;
    routerReason: string;
  };
}
const formatInline = (text: string) => {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  for (const match of text.matchAll(regex)) {
    const matchText = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }
    if (matchText.startsWith('**')) {
      parts.push(<strong key={`${index}-b`}>{matchText.slice(2, -2)}</strong>);
    } else if (matchText.startsWith('*')) {
      parts.push(<em key={`${index}-i`}>{matchText.slice(1, -1)}</em>);
    } else if (matchText.startsWith('`')) {
      parts.push(
        <code key={`${index}-c`} className="px-1 py-0.5 rounded bg-black/30 text-[13px] text-primary/90">
          {matchText.slice(1, -1)}
        </code>
      );
    }
    lastIndex = index + matchText.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
};
const formatBlocks = (text: string) => {
  const lines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;
  const flushList = (keyBase: number) => {
    if (!listBuffer) return;
    const ListTag = listBuffer.type === 'ul' ? 'ul' : 'ol';
    blocks.push(
      <ListTag key={`list-${keyBase}`} className={`ml-5 space-y-1 ${listBuffer.type === 'ol' ? 'list-decimal' : 'list-disc'}`}>
        {listBuffer.items.map((item, idx) => (
          <li key={`li-${keyBase}-${idx}`} className="text-[15px] leading-relaxed">
            {formatInline(item)}
          </li>
        ))}
      </ListTag>
    );
    listBuffer = null;
  };
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(idx);
      blocks.push(<div key={`spacer-${idx}`} className="h-3"></div>);
      return;
    }
    const unorderedMatch = trimmed.match(/^[-•*]\s+(.*)$/);
    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (unorderedMatch) {
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList(idx);
        listBuffer = { type: 'ul', items: [] };
      }
      listBuffer.items.push(unorderedMatch[1]);
      return;
    }
    if (orderedMatch) {
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList(idx);
        listBuffer = { type: 'ol', items: [] };
      }
      listBuffer.items.push(orderedMatch[1]);
      return;
    }
    flushList(idx);
    blocks.push(
      <p key={`p-${idx}`} className="text-[15px] leading-relaxed">
        {formatInline(line)}
      </p>
    );
  });
  flushList(lines.length);
  return blocks;
};
export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, isLast, attachments, modelInfo }) => {
  const isAssistant = role === 'assistant';
  let thinkingContent = '';
  let finalContent = content;
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    thinkingContent = thinkMatch[1].trim();
    finalContent = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
  } else if (content.includes('<think>')) {
    const parts = content.split('<think>');
    if (parts[1]) {
      thinkingContent = parts[1].trim();
      finalContent = parts[0].trim();
    }
  } else if (content.includes('</think>')) {
    const parts = content.split('</think>');
    finalContent = parts[1].trim();
  }
  const isStreaming = isAssistant && !finalContent && isLast;
  const hasAttachments = (attachments?.length ?? 0) > 0;
  const copyText = finalContent || content;
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [ttsError, setTtsError] = useState<string | null>(null);
  const handleSpeak = async () => {
    if (!isAssistant || !copyText.trim() || ttsStatus === 'loading') return;
    setTtsStatus('loading');
    setTtsError(null);
    try {
      const data = await api.tts(copyText);
      if (!data?.audioBase64) {
        setTtsStatus('error');
        setTtsError(data?.error || 'Falha ao gerar audio.');
        return;
      }
      const mimeType = data.mimeType || 'audio/wav';
      const audio = new Audio(`data:${mimeType};base64,${data.audioBase64}`);
      await audio.play();
      setTtsStatus('idle');
    } catch (error) {
      setTtsStatus('error');
      setTtsError(error instanceof Error ? error.message : 'Falha ao gerar audio.');
    }
  };
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} animate-in`}>
      <div className={`flex gap-4 max-w-[85%] ${role === 'user' ? 'flex-row-reverse' : ''}`}>
        <div
          className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-sm font-black shadow-lg shadow-black/20 ${role === 'user'
            ? 'bg-linear-to-br from-primary to-blue-500 text-white'
            : 'bg-linear-to-br from-slate-800 to-slate-900 border border-white/20 text-primary'
            }`}
        >
          {role === 'user' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
        </div>
        <div
          className={`p-6 rounded-3xl relative glass-card group transition-all duration-300 shadow-xl ${role === 'user' ? 'border-primary/30 bg-primary/10 text-white' :
            modelInfo && !modelInfo.isDefaultModel ?
              'border-white/10 bg-linear-to-br from-purple-900/50 to-blue-900/50 text-slate-100 mt-2 shadow-lg shadow-purple-500/20' :
              'border-white/10 bg-slate-800/80 text-slate-100 mt-2'
            }`}
        >
          {isStreaming && (
            <div className="mb-4 flex flex-col gap-2 text-[10px] uppercase tracking-[0.4em] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-ping"></span>
                <span>PENSANDO</span>
                <div className="flex gap-1 pl-3">
                  {[0, 1, 2].map(idx => (
                    <span
                      key={idx}
                      className="h-1.5 w-1.5 rounded-full bg-primary think-pulse-dot"
                      style={{ animationDelay: `${idx * 0.2}s` }}
                    ></span>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-black tracking-[0.25em]">Inteligência em fluxo.</p>
            </div>
          )}
          {isAssistant && thinkingContent && (
            <div className={`${finalContent ? 'mb-6' : 'mb-2'} bg-black/20 rounded-xl border border-white/5 shadow-inner transition-all px-4 py-3`}>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-slate-400">
                <span className="inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_20px_rgba(59,130,246,0.7)]"></span>
                <span>Cadeia de Pensamento</span>
              </div>
              <p className="mt-3 text-xs text-slate-300 font-mono italic leading-relaxed whitespace-pre-wrap">
                {thinkingContent}
              </p>
            </div>
          )}
          <div className="space-y-4">
            {finalContent ? (
              <div className="space-y-3 text-[15px] leading-relaxed font-sans selection:bg-primary/30">
                {formatBlocks(finalContent)}
              </div>
            ) : isLast ? (
              <div className="flex gap-1.5 py-2 opacity-50">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            ) : null}
          </div>
          {hasAttachments && (
            <div className="mt-4 grid gap-3">
              {attachments?.map((att) => (
                <div key={att.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  {att.type === 'image' && att.previewUrl ? (
                    <img
                      src={att.previewUrl}
                      alt={att.name}
                      className="w-full max-h-64 object-cover rounded-xl border border-white/10"
                    />
                  ) : null}
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
                    <span className="truncate">{att.name}</span>
                    <span className="text-[10px] text-slate-500">{Math.ceil(att.size / 1024)} KB</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-3">
            {isAssistant && (
              <button
                onClick={handleSpeak}
                className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-1"
                title={ttsError || 'Reproduzir audio'}
                aria-label="Reproduzir audio"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V5l12-2v14l-12 2zM9 19a2 2 0 11-4 0 2 2 0 014 0zM21 17a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {ttsStatus === 'loading' ? 'Gerando' : 'Voz'}
              </button>
            )}
            <button
              onClick={() => navigator.clipboard?.writeText(copyText)}
              className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copiar
            </button>
          </div>
          {modelInfo && !modelInfo.isDefaultModel && (
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 border-l-4 border-purple-500 bg-purple-900/10 animate-pulse">
              <span className="font-mono text-purple-400">{modelInfo.modelId}</span>
              <span className="text-[10px] uppercase tracking-widest text-purple-400">
                Modelo Especial
              </span>
              <span className="ml-2 text-[10px] text-purple-400">
                Modelo: {modelInfo.modelId}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

