import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, ShieldCheck, AlertTriangle, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const RESERVATION_SECONDS = 300; // 5 minutos

export default function ReservaLoteModal({ isOpen, onClose, onConfirm, loteTitle }) {
    const [secondsLeft, setSecondsLeft] = useState(RESERVATION_SECONDS);
    const intervalRef = useRef(null);
    const hasExpired = useRef(false);

    useEffect(() => {
        if (!isOpen) {
            setSecondsLeft(RESERVATION_SECONDS);
            hasExpired.current = false;
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        hasExpired.current = false;
        setSecondsLeft(RESERVATION_SECONDS);

        intervalRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current);
                    if (!hasExpired.current) {
                        hasExpired.current = true;
                        // Timer expirou — fecha modal e libera lote
                        setTimeout(() => onClose('expired'), 0);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const progressPct = (secondsLeft / RESERVATION_SECONDS) * 100;
    const isUrgent = secondsLeft <= 60;

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => onClose('cancelled')}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Barra de progresso no topo */}
                <div className="h-1.5 bg-[#0d1117] w-full">
                    <div
                        className={`h-full transition-all duration-1000 ease-linear rounded-r-full ${isUrgent ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${progressPct}%` }}
                    />
                </div>

                <div className="p-6 space-y-5">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl ${isUrgent ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                                <Lock size={24} className={isUrgent ? 'text-red-400' : 'text-emerald-400'} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg leading-tight">Garanta seu pagamento para reservar este lote</h3>
                            </div>
                        </div>
                        <button onClick={() => onClose('cancelled')} className="text-slate-500 hover:text-white transition-colors p-1">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Cronômetro */}
                    <div className={`text-center py-4 rounded-xl border ${isUrgent ? 'bg-red-900/20 border-red-500/40' : 'bg-[#0d1117] border-[#30363d]'}`}>
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Clock size={18} className={isUrgent ? 'text-red-400 animate-pulse' : 'text-emerald-400'} />
                            <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Tempo restante</span>
                        </div>
                        <p className={`text-5xl font-black tracking-tight font-mono ${isUrgent ? 'text-red-400' : 'text-white'}`}>
                            {timeStr}
                        </p>
                        {isUrgent && (
                            <p className="text-xs text-red-400 mt-2 font-semibold animate-pulse">Atenção: restam menos de 1 minuto!</p>
                        )}
                    </div>

                    {/* Lote title */}
                    {loteTitle && (
                        <div className="bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Lote selecionado</p>
                            <p className="text-sm font-semibold text-white line-clamp-2">{loteTitle}</p>
                        </div>
                    )}

                    {/* Copy principal */}
                    <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                        <p>
                            Ao clicar em <strong className="text-white">"Garantir pagamento e reservar lote"</strong>, ele ficará temporariamente reservado para você e deixará de ser exibido para outros investidores.
                        </p>
                        <p>
                            Você terá até <strong className="text-emerald-400">5 minutos</strong> para concluir o pagamento e garantir sua prioridade na negociação.
                        </p>
                        <p>
                            Caso o pagamento não seja realizado dentro desse prazo, o lote será automaticamente liberado e voltará a ficar disponível para todos os investidores.
                        </p>
                    </div>

                    {/* Pontos importantes */}
                    <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 space-y-2">
                        <p className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <AlertTriangle size={14} /> Importante
                        </p>
                        <ul className="text-sm text-amber-200/80 space-y-1.5">
                            <li className="flex items-start gap-2">
                                <ShieldCheck size={14} className="text-amber-400 mt-0.5 shrink-0" />
                                O lote ficará exclusivo para você por tempo limitado
                            </li>
                            <li className="flex items-start gap-2">
                                <Clock size={14} className="text-amber-400 mt-0.5 shrink-0" />
                                Após 5 minutos sem pagamento, ele será reaberto para o mercado
                            </li>
                            <li className="flex items-start gap-2">
                                <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                                Outros investidores poderão competir novamente pelo lote
                            </li>
                        </ul>
                    </div>

                    {/* Aviso final */}
                    <p className="text-xs text-slate-500 text-center">
                        👉 Confirme apenas se estiver pronto para finalizar o pagamento agora
                    </p>

                    {/* Botões */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => onClose('cancelled')}
                            className="flex-1 bg-[#0d1117] border border-[#30363d] text-slate-400 hover:text-white hover:border-slate-500 font-semibold py-3 rounded-xl transition-colors text-sm"
                        >
                            Voltar
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-500/20"
                        >
                            <ShieldCheck size={18} />
                            Garantir pagamento e reservar lote
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}