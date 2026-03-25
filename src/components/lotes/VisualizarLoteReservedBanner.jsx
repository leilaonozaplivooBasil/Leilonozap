import React, { useState, useEffect, useRef } from 'react';
import { Lock, Clock } from 'lucide-react';

export default function VisualizarLoteReservedBanner({ reservedUntil, onExpired }) {
    const [secondsLeft, setSecondsLeft] = useState(0);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (!reservedUntil) return;
        const calc = () => Math.max(0, Math.floor((new Date(reservedUntil) - new Date()) / 1000));
        setSecondsLeft(calc());

        intervalRef.current = setInterval(() => {
            const remaining = calc();
            setSecondsLeft(remaining);
            if (remaining <= 0) {
                clearInterval(intervalRef.current);
                onExpired?.();
            }
        }, 1000);

        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [reservedUntil]);

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const isUrgent = secondsLeft <= 60;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d1117]/95 backdrop-blur-lg border-t border-amber-500/30">
            <div className="max-w-7xl mx-auto p-4">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <div className="flex items-center gap-3 text-amber-400">
                        <Lock size={20} />
                        <p className="font-bold text-sm">Reservado por outro investidor</p>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isUrgent ? 'bg-red-900/30 border-red-500/40' : 'bg-[#161b22] border-amber-500/30'}`}>
                        <Clock size={16} className={isUrgent ? 'text-red-400 animate-pulse' : 'text-amber-400'} />
                        <span className={`text-xl font-black font-mono tracking-wider ${isUrgent ? 'text-red-400' : 'text-white'}`}>{timeStr}</span>
                    </div>
                    <p className="text-slate-400 text-xs text-center sm:text-left">Pode voltar a ficar disponível após o timer.</p>
                </div>
            </div>
        </div>
    );
}