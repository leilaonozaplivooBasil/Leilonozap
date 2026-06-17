import React, { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, AlertOctagon, Search } from 'lucide-react';
import { searchGoogleShopping } from '@/functions/searchGoogleShopping';
import { cleanProductTitle, hashTitle } from '@/lib/cleanProductTitle';

const CACHE_PREFIX = 'ml_valid_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const formatCurrency = (val) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

function readCache(key) {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return parsed.data;
    } catch {
        return null;
    }
}

function writeCache(key, data) {
    try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ savedAt: Date.now(), data }));
    } catch { /* storage cheio: ignora */ }
}

function getDivergenceLevel(valorPlanilha, mlPrice) {
    if (!valorPlanilha || !mlPrice) return 'unknown';
    const diff = Math.abs(mlPrice - valorPlanilha) / mlPrice;
    if (diff < 0.15) return 'ok';
    if (diff < 0.40) return 'warn';
    return 'alert';
}

export default function MLValidationButton({ descricao, valorPlanilha }) {
    const cacheKey = hashTitle(descricao);
    const [state, setState] = useState(() => {
        const cached = readCache(cacheKey);
        return cached ? { status: 'done', ...cached } : { status: 'idle' };
    });
    const abortRef = useRef(null);

    // Cancela fetch ao desmontar (fechar modal)
    useEffect(() => {
        return () => {
            if (abortRef.current) abortRef.current.abort();
        };
    }, []);

    const handleValidate = async () => {
        if (state.status === 'loading') return;

        const controller = new AbortController();
        abortRef.current = controller;
        setState({ status: 'loading' });

        try {
            const cleaned = cleanProductTitle(descricao);
            if (!cleaned || cleaned.length < 3) {
                setState({ status: 'error', message: 'Título muito curto' });
                return;
            }

            const response = await searchGoogleShopping({ query: cleaned });
            if (controller.signal.aborted) return;

            const results = response?.data?.results || [];
            const validPrices = results
                .map(r => r.price)
                .filter(p => typeof p === 'number' && p > 0);

            if (validPrices.length === 0) {
                const errData = { status: 'error', message: 'Sem resultados ML' };
                setState(errData);
                return;
            }

            const avgPrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
            const level = getDivergenceLevel(valorPlanilha, avgPrice);
            const data = { mlPrice: avgPrice, level, count: validPrices.length };
            writeCache(cacheKey, data);
            setState({ status: 'done', ...data });
        } catch (err) {
            if (controller.signal.aborted) return;
            setState({ status: 'error', message: err?.message || 'Erro ao validar' });
        }
    };

    // Estado: ocioso (botão Validar)
    if (state.status === 'idle') {
        return (
            <button
                onClick={handleValidate}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-white/5 hover:bg-white/10 border border-slate-600 hover:border-slate-400 text-slate-300 transition-all"
            >
                <Search size={12} />
                Validar
            </button>
        );
    }

    // Estado: carregando (spinner)
    if (state.status === 'loading') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-400">
                <Loader2 size={12} className="animate-spin" />
                Buscando...
            </span>
        );
    }

    // Estado: erro (clicável p/ retry)
    if (state.status === 'error') {
        return (
            <button
                onClick={handleValidate}
                title={state.message || 'Tentar novamente'}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600 text-slate-400 transition-all"
            >
                <Search size={12} />
                Tentar de novo
            </button>
        );
    }

    // Estado: validado — mostra preço ML + badge de divergência
    const { mlPrice, level } = state;
    const config = {
        ok:    { Icon: CheckCircle2, classes: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', label: 'OK' },
        warn:  { Icon: AlertTriangle, classes: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400', label: '!' },
        alert: { Icon: AlertOctagon, classes: 'bg-red-500/10 border-red-500/30 text-red-400', label: 'ALERTA' },
        unknown: { Icon: AlertTriangle, classes: 'bg-slate-500/10 border-slate-500/30 text-slate-400', label: '?' },
    }[level] || { Icon: AlertTriangle, classes: 'bg-slate-500/10 border-slate-500/30 text-slate-400', label: '?' };
    const { Icon } = config;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold border ${config.classes}`}>
            <Icon size={12} />
            <span className="tabular-nums">{formatCurrency(mlPrice)}</span>
        </span>
    );
}