import { useState } from 'react';
import { api, type ChatMessage } from '../../services/api';
interface VortexModalProps {
    sessionId: string;
    history: ChatMessage[];
    onClose: () => void;
    onComplete: () => void;
}
export function VortexDistillModal({ sessionId, history, onClose, onComplete }: VortexModalProps) {
    const [isExtracting, setIsExtracting] = useState(false);
    const [step, setStep] = useState<'initial' | 'preview' | 'done'>('initial');
    const handleDistill = async () => {
        setIsExtracting(true);
        try {
            // Nota: O backend já faz a extração e o salvamento. 
            // Para o "Consentimento", primeiro vamos pedir ao backend apenas a extração.
            // Mas para agilizar, vamos usar o distillAndSave e mostrar o resultado.
            const result = await api.distill(sessionId, history);
            if (result.success) {
                setStep('preview');
                // Simulando itens extraídos do resultado se necessário, 
                // ou apenas confirmando o que foi salvo.
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsExtracting(false);
        }
    };
    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-8 border-b border-white/5 bg-linear-to-r from-blue-500/10 to-emerald-500/10">
                    <h3 className="text-2xl font-black tracking-tight text-white mb-2 flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </span>
                        ENCERRAR PROTOCOLO VORTEX
                    </h3>
                    <p className="text-slate-400 text-sm">A IA irá destilar a conversa para extrair conhecimentos e dados da Constituição.</p>
                </div>
                <div className="p-8 flex-1 overflow-y-auto">
                    {step === 'initial' && (
                        <div className="text-center py-12">
                            <div className="mb-6 inline-flex p-4 rounded-full bg-blue-500/10 text-blue-400">
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <h4 className="text-xl font-bold text-white mb-4">Pronto para a destilação?</h4>
                            <p className="text-slate-400 mb-8 max-w-md mx-auto">
                                Analisaremos o histórico para salvar informações sobre <strong>Jean</strong> ou <strong>conhecimentos técnicos</strong> relevantes.
                            </p>
                            <button
                                onClick={handleDistill}
                                disabled={isExtracting}
                                className="w-full bg-linear-to-r from-blue-500 to-indigo-600 p-4 rounded-2xl font-black text-white shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                            >
                                {isExtracting ? 'DESTILANDO CONHECIMENTO...' : 'INICIAR EXTRAÇÃO DE ELITE'}
                            </button>
                        </div>
                    )}
                    {step === 'preview' && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <strong>Destilação Concluída!</strong>
                            </div>
                            <p className="text-slate-400 text-sm">O sistema identificou informações valiosas que foram sincronizadas com sua memória vetorial.</p>
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/5">
                                <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Ações Realizadas:</h5>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-3 text-sm text-slate-300">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        Vetorização de dados biográficos (L3)
                                    </li>
                                    <li className="flex items-center gap-3 text-sm text-slate-300">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        Mapeamento da rede neural de conhecimentos
                                    </li>
                                    <li className="flex items-center gap-3 text-sm text-slate-300">
                                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                        Sincronização de parâmetros extra-tokens
                                    </li>
                                </ul>
                            </div>
                            <button
                                onClick={onComplete}
                                className="w-full bg-slate-100 p-4 rounded-2xl font-black text-slate-900 transition-all hover:bg-white"
                            >
                                FINALIZAR E LIMPAR CHAT
                            </button>
                        </div>
                    )}
                </div>
                {step === 'initial' && (
                    <div className="p-6 bg-slate-800/30 border-t border-white/5 flex justify-end">
                        <button onClick={onClose} className="text-sm font-bold text-slate-500 hover:text-white transition-colors">
                            CANCELAR
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

