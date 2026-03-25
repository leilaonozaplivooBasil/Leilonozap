import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function LoteArrematadoOverlay({ winnerName }) {
    return (
        <div className="absolute inset-0 z-10 bg-black/75 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center text-center p-6">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mb-3">
                <CheckCircle2 size={28} className="text-emerald-400" />
            </div>
            <p className="text-emerald-400 font-bold text-base mb-1">Lote Arrematado</p>
            {winnerName && (
                <p className="text-slate-300 text-xs">Arrematado por <span className="font-semibold text-white">{winnerName}</span></p>
            )}
            <p className="text-slate-500 text-[10px] mt-3">Este lote não está mais disponível para investimento.</p>
        </div>
    );
}