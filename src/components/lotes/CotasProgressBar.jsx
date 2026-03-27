import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Loader2 } from 'lucide-react';

const LoteCota = base44.entities.LoteCota;

/**
 * CotasProgressBar
 * Exibe a barra de progresso de cotas reservadas para um lote no Modelo B.
 * Props:
 *   loteId        — string: ID do Auction
 *   maxPercentual — number: percentual máximo que o usuário pode reservar (default 100)
 *   onCotasLoaded — fn(totalReservado: number, cotistas: number): callback opcional
 */
export default function CotasProgressBar({ loteId, maxPercentual = 100, onCotasLoaded }) {
    const [totalReservado, setTotalReservado] = useState(0);
    const [cotistas, setCotistas] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!loteId) return;
        setIsLoading(true);
        LoteCota.filter({ lote_id: loteId, status: 'reservado' })
            .then(cotas => {
                const reservado = (cotas || []).reduce((acc, c) => acc + (c.percentual_cota || 0), 0);
                const n = (cotas || []).length;
                setTotalReservado(Math.min(reservado, 100));
                setCotistas(n);
                if (onCotasLoaded) onCotasLoaded(Math.min(reservado, 100), n);
            })
            .catch(() => {
                setTotalReservado(0);
                setCotistas(0);
                if (onCotasLoaded) onCotasLoaded(0, 0);
            })
            .finally(() => setIsLoading(false));
    }, [loteId]);

    const disponivel = Math.max(0, 100 - totalReservado);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-slate-500 text-xs py-2">
                <Loader2 size={13} className="animate-spin" />
                Carregando cotas...
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Legenda */}
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                    <Users size={12} className="text-violet-400" />
                    <span>
                        <span className="text-white font-bold">{cotistas}</span> investidor{cotistas !== 1 ? 'es' : ''} participando
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-rose-400 font-semibold">{totalReservado.toFixed(0)}% reservado</span>
                    <span className="text-emerald-400 font-semibold">{disponivel.toFixed(0)}% disponível</span>
                </div>
            </div>

            {/* Barra */}
            <div className="w-full bg-[#0d1117] rounded-full h-3 overflow-hidden border border-[#30363d]">
                <div
                    className="h-3 rounded-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-700"
                    style={{ width: `${totalReservado}%` }}
                />
            </div>

            {/* Aviso se lote quase cheio */}
            {disponivel < 20 && disponivel > 0 && (
                <p className="text-[10px] text-amber-400 font-bold">
                    ⚠️ Restam apenas {disponivel.toFixed(0)}% disponíveis neste lote!
                </p>
            )}
            {disponivel === 0 && (
                <p className="text-[10px] text-red-400 font-bold">
                    🔴 Este lote está 100% reservado.
                </p>
            )}
        </div>
    );
}
