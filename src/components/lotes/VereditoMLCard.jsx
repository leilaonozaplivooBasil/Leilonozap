import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ShieldCheck, Loader2, Play, RotateCcw, CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle, Sparkles } from 'lucide-react';
import { searchGoogleShopping } from '@/functions/searchGoogleShopping';
import { cleanProductTitle, hashTitle } from '@/lib/cleanProductTitle';

// Compartilhado com MLValidationButton (cache v3)
const CACHE_PREFIX = 'ml_valid_v3_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const POOL_SIZE = 5; // chamadas em paralelo

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
    } catch { /* ignora */ }
}

// Busca 1 item (mesma lógica do MLValidationButton)
async function fetchMLForItem(item, signal) {
    const cacheKey = hashTitle(item.desc);
    const cached = readCache(cacheKey);
    if (cached) {
        return { item, cached: true, ...cached };
    }

    const cleaned = cleanProductTitle(item.desc);
    if (!cleaned || cleaned.length < 3) {
        return { item, cached: false, level: 'no_ml' };
    }

    try {
        const response = await searchGoogleShopping({ productName: cleaned });
        if (signal?.aborted) return null;

        const results = response?.data?.products || [];
        const mlProducts = results.filter(r => {
            if (!r || typeof r.price !== 'number' || r.price <= 0) return false;
            const isMLSource = typeof r.source === 'string' && r.source.toLowerCase().includes('mercado livre');
            const hasMLUrl = !!r.mercadolivre_url;
            return isMLSource || hasMLUrl;
        });

        if (mlProducts.length === 0) {
            const data = { level: 'no_ml' };
            writeCache(cacheKey, data);
            return { item, cached: false, ...data };
        }

        const primary = mlProducts[0];
        const data = {
            mlPrice: primary.price,
            productUrl: primary.mercadolivre_url || primary.url || null,
        };
        writeCache(cacheKey, data);
        return { item, cached: false, ...data };
    } catch (err) {
        return { item, cached: false, error: err?.message || 'erro' };
    }
}

export default function VereditoMLCard({ itens = [], totalPlanilha = 0 }) {
    const [status, setStatus] = useState('idle'); // idle | auditing | done
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [results, setResults] = useState([]); // array de {item, mlPrice?, level?, productUrl?}
    const abortRef = useRef(null);
    const startedAtRef = useRef(null);

    // Limpa ao desmontar / trocar lote
    useEffect(() => {
        return () => {
            if (abortRef.current) abortRef.current.abort();
        };
    }, []);

    // Quando o lote (itens) muda, reseta o estado
    useEffect(() => {
        if (abortRef.current) abortRef.current.abort();
        setStatus('idle');
        setProgress({ done: 0, total: 0 });
        setResults([]);
    }, [itens]);

    const runAudit = async () => {
        if (status === 'auditing') return;
        if (!itens || itens.length === 0) return;

        const controller = new AbortController();
        abortRef.current = controller;
        startedAtRef.current = Date.now();

        // Deduplica por descrição (mesmo item repetido = 1 consulta só)
        const itemsToProcess = itens.filter(i => i && i.desc);
        const total = itemsToProcess.length;

        setStatus('auditing');
        setProgress({ done: 0, total });
        setResults([]);

        const accumulated = [];
        let doneCount = 0;

        // Pool de workers em paralelo
        let cursor = 0;
        const workers = Array.from({ length: Math.min(POOL_SIZE, total) }, async () => {
            while (cursor < itemsToProcess.length && !controller.signal.aborted) {
                const myIdx = cursor++;
                const item = itemsToProcess[myIdx];
                const res = await fetchMLForItem(item, controller.signal);
                if (controller.signal.aborted) return;
                if (res) accumulated.push(res);
                doneCount++;
                setProgress({ done: doneCount, total });
            }
        });

        await Promise.all(workers);
        if (controller.signal.aborted) return;

        setResults(accumulated);
        setStatus('done');
    };

    const cancelAudit = () => {
        if (abortRef.current) abortRef.current.abort();
        setStatus('idle');
        setProgress({ done: 0, total: 0 });
    };

    const resetAudit = () => {
        cancelAudit();
        setResults([]);
    };

    // Agregações do veredito
    const veredito = useMemo(() => {
        if (status !== 'done' || results.length === 0) return null;

        let totalMLEncontrado = 0;
        let totalPlanilhaConferida = 0;
        let verdes = 0, amarelos = 0, vermelhos = 0, semML = 0;

        for (const r of results) {
            if (typeof r.mlPrice === 'number' && r.mlPrice > 0) {
                const qtd = r.item.qtd || 1;
                const valorPlanilhaUnit = r.item.valor || 0;
                totalMLEncontrado += r.mlPrice * qtd;
                totalPlanilhaConferida += valorPlanilhaUnit * qtd;

                if (valorPlanilhaUnit > 0) {
                    const ratio = (r.mlPrice - valorPlanilhaUnit) / valorPlanilhaUnit;
                    if (ratio >= 0) verdes++;
                    else if (ratio >= -0.15) amarelos++;
                    else vermelhos++;
                } else {
                    verdes++;
                }
            } else {
                semML++;
            }
        }

        const ratioGlobal = totalPlanilhaConferida > 0
            ? (totalMLEncontrado - totalPlanilhaConferida) / totalPlanilhaConferida
            : 0;

        let level;
        if (totalPlanilhaConferida === 0) level = 'unknown';
        else if (ratioGlobal >= 0) level = 'ok';
        else if (ratioGlobal >= -0.15) level = 'warn';
        else level = 'alert';

        return {
            totalMLEncontrado,
            totalPlanilhaConferida,
            ratioGlobal,
            level,
            verdes, amarelos, vermelhos, semML,
            totalAuditados: results.length,
        };
    }, [results, status]);

    const levelConfig = {
        ok:      { Icon: CheckCircle2, classes: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300', label: '🟢 MERCADO VALIDA O LOTE' },
        warn:    { Icon: AlertTriangle, classes: 'bg-yellow-500/10 border-yellow-500/40 text-yellow-300', label: '🟡 ATENÇÃO — MARGEM APERTADA' },
        alert:   { Icon: AlertOctagon, classes: 'bg-red-500/10 border-red-500/40 text-red-300', label: '🔴 ALERTA — PLANILHA SUPERFATURADA' },
        unknown: { Icon: HelpCircle, classes: 'bg-slate-500/10 border-slate-500/40 text-slate-300', label: '❓ INSUFICIENTE PARA VEREDITO' },
    };

    // === RENDER ===
    if (!itens || itens.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-[#161b22] via-[#161b22] to-[#0d1117] border border-emerald-500/20 rounded-2xl shadow-2xl shadow-emerald-500/5 overflow-hidden relative">
            {/* glow decorativo */}
            <div className="absolute top-0 left-1/2 w-[600px] h-[200px] bg-emerald-500/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

            {/* HEADER */}
            <div className="relative z-10 p-5 border-b border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                        <ShieldCheck size={22} className="text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-black text-white text-lg tracking-tight flex items-center gap-2">
                            VEREDITO ML
                            <Sparkles size={14} className="text-emerald-400" />
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Auditoria de mercado em tempo real • {itens.length} itens vs Mercado Livre
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {status === 'idle' && (
                        <button
                            onClick={runAudit}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5"
                        >
                            <Play size={14} fill="currentColor" />
                            Auditar agora
                        </button>
                    )}
                    {status === 'auditing' && (
                        <button
                            onClick={cancelAudit}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition-all"
                        >
                            Cancelar
                        </button>
                    )}
                    {status === 'done' && (
                        <button
                            onClick={resetAudit}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition-all"
                            title="Refazer auditoria"
                        >
                            <RotateCcw size={14} />
                            Refazer
                        </button>
                    )}
                </div>
            </div>

            {/* BODY */}
            <div className="relative z-10 p-5 sm:p-6">
                {/* Estado IDLE — explicação + CTA */}
                {status === 'idle' && (
                    <div className="text-center py-2">
                        <p className="text-sm text-slate-300 leading-relaxed max-w-xl mx-auto mb-4">
                            Compare o <span className="font-bold text-emerald-300">{formatCurrency(totalPlanilha)}</span> da planilha
                            contra o <span className="font-bold text-white">preço real</span> de cada item no Mercado Livre.
                            Receba um veredito único e auditável.
                        </p>
                        <div className="inline-flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 5 consultas paralelas</span>
                            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Cache 24h por item</span>
                            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Preço↔Link auditável</span>
                        </div>
                    </div>
                )}

                {/* Estado AUDITING — progresso */}
                {status === 'auditing' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                                <Loader2 size={16} className="animate-spin" />
                                Auditando {progress.done} de {progress.total} itens
                            </div>
                            <span className="text-2xl font-black text-white tabular-nums">
                                {progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%
                            </span>
                        </div>
                        <div className="h-2.5 bg-[#0d1117] rounded-full overflow-hidden border border-[#30363d]">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300 shadow-lg shadow-emerald-500/30"
                                style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 text-center">
                            Consultando Mercado Livre em paralelo • cache automático
                        </p>
                    </div>
                )}

                {/* Estado DONE — veredito */}
                {status === 'done' && veredito && (
                    <div className="space-y-5">
                        {/* Badge do veredito */}
                        <div className={`rounded-xl border-2 p-4 sm:p-5 ${levelConfig[veredito.level].classes} text-center`}>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">{levelConfig[veredito.level].label}</p>
                            <p className="text-3xl sm:text-4xl font-black tabular-nums my-1">
                                {formatCurrency(veredito.totalMLEncontrado)}
                            </p>
                            <p className="text-sm font-semibold">
                                {veredito.ratioGlobal >= 0 ? '+' : ''}{(veredito.ratioGlobal * 100).toFixed(1)}% vs planilha
                                <span className="opacity-60 ml-2">({formatCurrency(veredito.totalPlanilhaConferida)})</span>
                            </p>
                        </div>

                        {/* Contagens */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
                                <p className="text-2xl font-black text-emerald-300 tabular-nums">{veredito.verdes}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 mt-0.5">ML ≥ Planilha</p>
                            </div>
                            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 text-center">
                                <p className="text-2xl font-black text-yellow-300 tabular-nums">{veredito.amarelos}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-400/80 mt-0.5">Margem apertada</p>
                            </div>
                            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-center">
                                <p className="text-2xl font-black text-red-300 tabular-nums">{veredito.vermelhos}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-red-400/80 mt-0.5">Superfaturados</p>
                            </div>
                            <div className="bg-slate-500/5 border border-slate-500/20 rounded-xl p-3 text-center">
                                <p className="text-2xl font-black text-slate-300 tabular-nums">{veredito.semML}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400/80 mt-0.5">Sem ML</p>
                            </div>
                        </div>

                        {/* Rodapé com metadado */}
                        <p className="text-center text-xs text-slate-500">
                            {veredito.totalAuditados} itens auditados • para conferir item-a-item, abra cada grade abaixo
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}