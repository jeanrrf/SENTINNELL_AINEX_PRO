// SENTINNELL_PRO/frontend/src/components/Sidebar/Sidebar.tsx
import React from 'react';
interface Session {
    id: string;
    title: string;
}
interface SidebarProps {
    sessions: Session[];
    activeSession: string | null;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
    onDeleteSession: (id: string) => void;
}
export const Sidebar: React.FC<SidebarProps> = ({ sessions, activeSession, onSelectSession, onNewChat, onDeleteSession }) => {
    return (
        <aside className="w-72 glass border-r border-emerald-500/15 flex flex-col md:flex transition-all duration-500 overflow-hidden">
            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-3 mb-10 group cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-emerald-400 flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-black font-display tracking-tighter text-white">
                        SENTINNELL<span className="text-primary">PRO</span>
                    </h1>
                </div>
                <button
                    onClick={onNewChat}
                    className="w-full py-3.5 mb-10 rounded-2xl neon-pill text-emerald-100 font-bold flex items-center justify-center gap-3 hover:text-white transition-all group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-linear-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <svg className="w-5 h-5 transition-transform group-hover:rotate-90 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="relative z-10 text-sm">Nova Sessão</span>
                </button>
                <nav className="space-y-2">
                    <div className="flex items-center justify-between mb-4 ml-1">
                        <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Sessões Reais</p>
                        <div className="w-8 h-px bg-emerald-500/15"></div>
                    </div>
                    {sessions.length === 0 ? (
                        <div className="px-5 py-4 rounded-2xl bg-white/5 border border-dashed border-emerald-500/20">
                            <p className="text-[11px] text-emerald-200/60 italic leading-relaxed text-center">Nenhuma conversa salva no banco ainda.</p>
                        </div>
                    ) : (
                        sessions.map(s => (
                            <div
                                key={s.id}
                                className={`w-full px-5 py-3.5 rounded-2xl text-[13px] font-medium transition-all flex items-center gap-3 group relative ${activeSession === s.id
                                    ? 'bg-emerald-500/10 border border-emerald-500/25 text-white shadow-xl shadow-emerald-500/10'
                                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <button
                                    onClick={() => onSelectSession(s.id)}
                                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                                >
                                    {activeSession === s.id && (
                                        <div className="absolute left-0 w-1 h-5 bg-primary rounded-full"></div>
                                    )}
                                    <svg className={`w-4 h-4 shrink-0 transition-colors ${activeSession === s.id ? 'text-primary' : 'text-slate-500 group-hover:text-emerald-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                    <span className="truncate">{s.title}</span>
                                </button>
                                <button
                                    onClick={() => onDeleteSession(s.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400"
                                    title="Excluir sessão"
                                    aria-label="Excluir sessão"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m2-3h6a2 2 0 012 2v1H7V6a2 2 0 012-2z" />
                                    </svg>
                                </button>
                            </div>
                        ))
                    )}
                </nav>
            </div>
            <div className="p-8 border-t border-emerald-500/15 space-y-6 bg-black/30 backdrop-blur-md">
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-black text-emerald-200/70 uppercase tracking-widest">
                        <span title="Saúde dos sistemas backend e IA">Status Neural</span>
                        <span className="text-accent flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                            Online
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full w-full bg-linear-to-r from-primary to-accent transition-all duration-1000"></div>
                    </div>
                    <p className="text-[9px] text-emerald-200/50 font-bold uppercase tracking-tighter">Sistemas Operacionais: 100%</p>
                </div>
                <div className="flex items-center gap-4 group cursor-pointer p-2 -m-2 rounded-2xl hover:bg-white/5 transition-colors">
                    <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-black/80 to-emerald-950 border border-emerald-500/20 flex items-center justify-center font-black text-xs text-white shadow-xl group-hover:border-primary/50 transition-colors">
                        AU
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white leading-none mb-1 truncate">Administrator</p>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Ultra Edition</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};
