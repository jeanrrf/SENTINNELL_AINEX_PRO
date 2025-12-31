// SENTINNELL_PRO/frontend/src/components/Memory/MemoryDashboard.tsx
import React, { useEffect, useState } from 'react';
interface Memory {
    id: string;
    content: string;
    tier: string;
    tags: string;
    createdAt: number;
}
export const MemoryDashboard: React.FC = () => {
    const [memories, setMemories] = useState<Memory[]>([]);
    const [context, setContext] = useState<Record<string, string>>({});
    useEffect(() => {
        const fetchData = async () => {
            try {
                const mems = await fetch('http://localhost:3001/api/memories').then(r => r.json());
                const ctx = await fetch('http://localhost:3001/api/affective-context').then(r => r.json());
                setMemories(mems);
                setContext(ctx);
            } catch (err) {
                console.error('Error fetching dashboard data', err);
            }
        };
        fetchData();
    }, []);
    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <section>
                <h2 className="text-xl font-bold text-gradient mb-6 flex items-center gap-2">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Contexto Afetivo (L3)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(context).length > 0 ? Object.entries(context).map(([key, value]) => (
                        <div key={key} className="p-4 rounded-xl bg-[#1e293b] border border-slate-700 shadow-lg">
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">{key}</p>
                            <p className="text-sm text-slate-200">{value}</p>
                        </div>
                    )) : (
                        <p className="text-sm text-slate-500 italic">Nenhum contexto emocional identificado ainda.</p>
                    )}
                </div>
            </section>
            <section>
                <h2 className="text-xl font-bold text-gradient mb-6 flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Repositório de Conhecimento (L2)
                </h2>
                <div className="space-y-4">
                    {memories.length > 0 ? memories.map(m => (
                        <div key={m.id} className="p-6 rounded-2xl bg-[#0f172a] border border-slate-700 hover:border-blue-500/30 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${m.tier === 'ouro' ? 'bg-yellow-500/10 text-yellow-500' :
                                    m.tier === 'prata' ? 'bg-slate-400/10 text-slate-400' :
                                        'bg-orange-500/10 text-orange-500'
                                    }`}>
                                    {m.tier}
                                </span>
                                <span className="text-[10px] text-slate-500">{new Date(m.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed">{m.content}</p>
                        </div>
                    )) : (
                        <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                            <p className="text-slate-500">O sistema ainda não extraiu conhecimentos significativos.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

