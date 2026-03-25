import React, { useState, useEffect, useRef } from 'react';
import { Clock, Lock } from 'lucide-react';

export default function LoteReservadoOverlay({ reservedUntil, onExpired }) {
    const [secondsLeft, setSecondsLeft] = useState(0);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (!reservedUntil) return;

        const calcSeconds = () => {
            const diff = Math.max(0, Math.floor((new Date(reservedUntil) - new Date()) / 1000));
            return diff;
        };

        setSecondsLeft(calcSeconds());

        intervalRef.current = setInterval(() => {
            const remaining = calcSeconds();
            setSecondsLeft(remaining);
            if (remaining <= 0) {
                clearInterval(intervalRef.current);
                onExpired?.();
            }
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [reservedUntil]);

    if (secondsLeft <= 0) return null;

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return (
        <div className="absolute inset-0 z-10 bg-black/70 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-3">
                <Lock size={22} className="text-amber-400" />
            </div>
            <p className="text-amber-400 font-bold text-sm mb-1">Reservado por outro investidor</p>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed max-w-[220px]">
                Este lote pode voltar a ficar disponível em:
            </p>
            <div className="bg-[#0d1117] border border-amber-500/30 rounded-xl px-5 py-3 flex items-center gap-2">
                <Clock size={16} className="text-amber-400" />
                <span className="text-2xl font-black text-white font-mono tracking-wider">{timeStr}</span>
            </div>
            <p className="text-slate-500 text-[10px] mt-3">Caso o pagamento não seja concluído, o lote será liberado automaticamente.</p>
        </div>
    );
}