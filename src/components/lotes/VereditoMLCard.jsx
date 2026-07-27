import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ShieldCheck, Loader2, Play, RotateCcw, CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle, Sparkles, FlaskConical, ShoppingBag } from 'lucide-react';
import { searchGoogleShopping } from '@/functions/searchGoogleShopping';

// 🧠 LIMPEZA DE TÍTULO — RECEITA DO COMPARAÍ (validada em produção)
function cleanTitleLocal(title) {
    if (!title) return '';
    let clean = title
        .replace(/leil[aã]o\s*(nozap|no\s*zap)?/gi, '')
        .replace(/\b(novo|usado|semi[-\s]?novo|original|lacrado|garantia|frete\s*gr[aá]tis)\b/gi, '')
        .replace(/\b(arremate|devolu[çc][aã]o|promo[çc][aã]o)\b/gi, '')
        .replace(/\b(110v|220v|bivolt)\b/gi, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const words = clean.split(' ').filter(w => w.length > 1);
    return words.slice(0, 8).join(' ');
}

// Hash simples pra chave de cache
function hashKey(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0;
    return Math.abs(h).toString(36);
}

// 🚫 ITEM NÃO-RASTREÁVEL — palavras-chave genéricas de leilão/atacado
// (não consomem cota SerpAPI e não poluem o veredito)
const UNTRACKABLE_KEYWORDS = [
    'produtos diversos', 'produto diverso', 'diversos diversos',
    'gaylord', 'gaylords',          // caixas de transporte, não produto
    'rezago', 'rezagos',            // categoria genérica
    'enoe',                          // código interno do fornecedor
    'sortidos', 'sortido',
    'mercadoria geral', 'mercadorias gerais',
    'lote misto', 'lotes mistos',
    'itens diversos', 'item diverso',
];

function isUntrackable(item) {
    const raw = (item?.desc || '').toString().trim();
    if (!raw || raw.length < 3) return true;
    const lower = raw.toLowerCase();
    // Padrões clássicos de planilhas sem descrição real
    if (/^item\s+linha\s+\d+/i.test(raw)) return true;
    if (/^sem\s+descri/i.test(raw)) return true;
    if (/^-+$/.test(raw)) return true;
    // Palavras-chave genéricas conhecidas
    for (const kw of UNTRACKABLE_KEYWORDS) {
        if (lower.includes(kw)) return true;
    }
    // Após limpeza, sobra menos de 2 palavras significativas → não rastreável
    const cleaned = cleanTitleLocal(raw);
    const words = cleaned.split(' ').filter(w => w.length > 2);
    if (words.length < 2) return true;
    return false;
}

// Cache v5 — invalidado após migração pra estratégia Comparaí-inspired
const CACHE_PREFIX = 'ml_valid_v5_';
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

// 🔍 BUSCA ÚNICA NA SERPAPI — aproveita resposta inteira (ML + varejo geral)
// Estratégia Comparaí: 1 chamada → pega o melhor resultado (ML preferido, varejo aceito)
async function fetchPriceForItem(item, signal) {
    const cacheKey = hashKey(item.desc);
    const cached = readCache(cacheKey);
    if (cached) return { item, cached: true, ...cached };

    const cleanedTerm = cleanTitleLocal(item.desc);
    if (!cleanedTerm || cleanedTerm.length < 3) {
        const data = { level: 'no_market' };
        writeCache(cacheKey, data);
        return { item, cached: false, ...data };
    }

    try {
        // 1ª tentativa: termo limpo + match-ratio 30% (igual Comparaí)
        const res = await searchGoogleShopping({ productName: item.desc });
        if (signal?.aborted) return null;

        const products = res?.data?.products || [];
        if (products.length > 0) {
            const primary = products[0]; // já vem ordenado: ML > matchRatio > preço
            const data = {
                marketPrice: primary.price,
                productUrl: primary.url,
                store: primary.store,
                isMercadoLivre: primary.isMercadoLivre === true,
                tier: primary.isMercadoLivre ? 'ml' : 'market',
                debug: { cleanedTerm, found: products.length, attempt: 1 },
            };
            writeCache(cacheKey, data);
            return { item, cached: false, ...data };
        }
    } catch (err) {
        if (signal?.aborted) return null;
        console.warn('SerpAPI erro:', err?.message);
    }

    // Nenhum resultado → marca como "sem rastreio"
    const data = { level: 'no_market', debug: { cleanedTerm, found: 0, attempt: 1 } };
    writeCache(cacheKey, data);
    return { item, cached: false, ...data };
}

export default function VereditoMLCard({ itens = [], totalPlanilha = 0 }) {
    const [status, setStatus] = useState('idle'); // idle | auditing | done | retrying
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [results, setResults] = useState([]);
    const [retryProgress, setRetryProgress] = useState({ done: 0, total: 0, found: 0 });
    const abortRef = useRef(null);

    useEffect(() => {
        return () => {
            if (abortRef.current) abortRef.current.abort();
        };
    }, []);

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

        // Pré-filtro: separa não-rastreáveis (não vão pra SerpAPI)
        const validItems = itens.filter(i => i && i.desc);
        const untrackableItems = validItems.filter(isUntrackable);
        const itemsToProcess = validItems.filter(i => !isUntrackable(i));
        const total = itemsToProcess.length;

        setStatus('auditing');
        setProgress({ done: 0, total });
        setResults([]);

        const accumulated = untrackableItems.map(item => ({
            item,
            level: 'untrackable',
            cached: false,
        }));
        let doneCount = 0;

        // Pool de workers em paralelo
        let cursor = 0;
        const workers = Array.from({ length: Math.min(POOL_SIZE, total) }, async () => {
            while (cursor < itemsToProcess.length && !controller.signal.aborted) {
                const myIdx = cursor++;
                const item = itemsToProcess[myIdx];
                const res = await fetchPriceForItem(item, controller.signal);
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

    // 🔄 RETRY com termo mais permissivo (match-ratio 20%) — só pra "no_market"
    const retryUnmatched = async () => {
        if (status === 'retrying') return;
        const noMarketItems = results.filter(r => !r.marketPrice && r.level === 'no_market');
        if (noMarketItems.length === 0) return;

        const controller = new AbortController();
        abortRef.current = controller;

        setStatus('retrying');
        setRetryProgress({ done: 0, total: noMarketItems.length, found: 0 });

        let cursor = 0;
        let doneCount = 0;
        let foundCount = 0;
        const updates = new Map();

        const workers = Array.from({ length: Math.min(POOL_SIZE, noMarketItems.length) }, async () => {
            while (cursor < noMarketItems.length && !controller.signal.aborted) {
                const myIdx = cursor++;
                const r = noMarketItems[myIdx];
                const cleaned = cleanTitleLocal(r.item.desc);
                if (!cleaned || cleaned.length < 3) {
                    doneCount++;
                    setRetryProgress({ done: doneCount, total: noMarketItems.length, found: foundCount });
                    continue;
                }
                try {
                    // Retry: termo já limpo + match-ratio mais frouxo (20%)
                    const res = await searchGoogleShopping({
                        productName: cleaned,
                        skipCleaning: true,
                        minMatchRatio: 0.2,
                    });
                    if (controller.signal.aborted) return;
                    const products = res?.data?.products || [];
                    if (products.length > 0) {
                        const primary = products[0];
                        const data = {
                            marketPrice: primary.price,
                            productUrl: primary.url,
                            store: primary.store,
                            isMercadoLivre: primary.isMercadoLivre === true,
                            tier: primary.isMercadoLivre ? 'ml_retry' : 'market_retry',
                        };
                        try {
                            localStorage.setItem(
                                CACHE_PREFIX + hashKey(r.item.desc),
                                JSON.stringify({ savedAt: Date.now(), data })
                            );
                        } catch { /* ignora */ }
                        updates.set(r.item.desc, { ...r, ...data, level: undefined });
                        foundCount++;
                    }
                } catch { /* falha individual não bloqueia */ }
                doneCount++;
                setRetryProgress({ done: doneCount, total: noMarketItems.length, found: foundCount });
            }
        });

        await Promise.all(workers);
        if (controller.signal.aborted) return;

        if (updates.size > 0) {
            setResults(prev => prev.map(r => updates.get(r.item.desc) || r));
        }
        setStatus('done');
    };

    // 🔬 Exporta CSV de diagnóstico
    const exportDiagnosticCSV = () => {
        if (!results || results.length === 0) return;
        const escape = (v) => {
            if (v === null || v === undefined) return '';
            const s = String(v).replace(/"/g, '""');
            return /[",\n;]/.test(s) ? `"${s}"` : s;
        };
        const header = [
            'desc_original', 'termo_buscado', 'origem', 'loja', 'preco_mercado', 'preco_planilha', 'url', 'resultado'
        ].join(',');
        const lines = results.map(r => {
            const d = r.debug || {};
            const origem = r.tier === 'ml' || r.tier === 'ml_retry'
                ? 'Mercado Livre'
                : r.tier === 'market' || r.tier === 'market_retry'
                    ? 'Varejo (Magalu/Amazon/etc)'
                    : r.level === 'untrackable' ? 'Não-rastreável' : 'Sem rastreio';
            const resultado = r.marketPrice ? 'ENCONTRADO' : (r.level === 'untrackable' ? 'PULADO' : 'SEM RASTREIO');
            return [
                escape(r.item?.desc),
                escape(d.cleanedTerm || ''),
                escape(origem),
                escape(r.store || ''),
                escape(r.marketPrice ?? ''),
                escape(r.item?.valor ?? ''),
                escape(r.productUrl || ''),
                escape(resultado),
            ].join(',');
        });
        const csv = '\uFEFF' + [header, ...lines].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `veredito-ml-diagnostico-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // ===================================================================
    // 🧮 AGREGAÇÕES DO VEREDITO
    // Tier 1 (ML) + Tier 2 (mercado geral) = AMBOS contam como "encontrado"
    // ===================================================================
    const veredito = useMemo(() => {
        if (status !== 'done' || results.length === 0) return null;

        let totalMercadoEncontrado = 0;
        let totalPlanilhaConferida = 0;
        let verdes = 0, amarelos = 0, vermelhos = 0;
        let semMercado = 0, naoRastreaveis = 0;
        let achadoML = 0, achadoMarket = 0;

        for (const r of results) {
            if (r.level === 'untrackable') {
                naoRastreaveis++;
                continue;
            }
            if (typeof r.marketPrice === 'number' && r.marketPrice > 0) {
                const qtd = r.item.qtd || 1;
                const valorPlanilhaUnit = r.item.valor || 0;
                totalMercadoEncontrado += r.marketPrice * qtd;
                totalPlanilhaConferida += valorPlanilhaUnit * qtd;

                if (r.isMercadoLivre) achadoML++; else achadoMarket++;

                if (valorPlanilhaUnit > 0) {
                    const ratio = (r.marketPrice - valorPlanilhaUnit) / valorPlanilhaUnit;
                    if (ratio >= 0) verdes++;
                    else if (ratio >= -0.15) amarelos++;
                    else vermelhos++;
                } else {
                    verdes++;
                }
            } else {
                semMercado++;
            }
        }

        const ratioGlobal = totalPlanilhaConferida > 0
            ? (totalMercadoEncontrado - totalPlanilhaConferida) / totalPlanilhaConferida
            : 0;

        let level;
        if (totalPlanilhaConferida === 0) level = 'unknown';
        else if (ratioGlobal >= 0) level = 'ok';
        else if (ratioGlobal >= -0.15) level = 'warn';
        else level = 'alert';

        return {
            totalMercadoEncontrado,
            totalPlanilhaConferida,
            ratioGlobal,
            level,
            verdes, amarelos, vermelhos,
            semMercado, naoRastreaveis,
            achadoML, achadoMarket,
            totalAuditados: results.length - naoRastreaveis,
        };
    }, [results, status]);

    const levelConfig = {
        ok:      { Icon: CheckCircle2, classes: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300', label: '🟢 VEREDITO: LOTE VALIDADO' },
        warn:    { Icon: AlertTriangle, classes: 'bg-yellow-500/10 border-yellow-500/40 text-yellow-300', label: '🟡 VEREDITO: MARGEM APERTADA' },
        alert:   { Icon: AlertOctagon, classes: 'bg-red-500/10 border-red-500/40 text-red-300', label: '🔴 VEREDITO: PLANILHA SUPERFATURADA' },
        unknown: { Icon: HelpCircle, classes: 'bg-slate-500/10 border-slate-500/40 text-slate-300', label: '❓ VEREDITO: DADOS INSUFICIENTES' },
    };

    if (!itens || itens.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-[#161b22] via-[#161b22] to-[#0d1117] border border-emerald-500/20 rounded-2xl shadow-2xl shadow-emerald-500/5 overflow-hidden relative">
            <div className="absolute top-0 left-1/2 w-[600px] h-[200px] bg-emerald-500/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

            {/* HEADER */}
            <div className="relative z-10 p-5 border-b border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                        <ShieldCheck size={22} className="text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-black text-white text-lg tracking-tight flex items-center gap-2">
                            VEREDITO DE MERCADO
                            <Sparkles size={14} className="text-emerald-400" />
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Auditoria via SerpAPI • {itens.length} itens vs Mercado Livre + Varejo
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
                {/* IDLE */}
                {status === 'idle' && (
                    <div className="text-center py-2">
                        <p className="text-sm text-slate-300 leading-relaxed max-w-xl mx-auto mb-4">
                            Compare o <span className="font-bold text-emerald-300">{formatCurrency(totalPlanilha)}</span> da planilha
                            contra o <span className="font-bold text-white">preço real</span> de cada item no Mercado Livre
                            e nos principais varejistas (Amazon, Magalu, Casas Bahia, Shopee).
                        </p>
                        <div className="inline-flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 1 consulta por item</span>
                            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Cache 24h</span>
                            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Match-ratio 30%</span>
                        </div>
                    </div>
                )}

                {/* AUDITING */}
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
                            Consultando Mercado Livre + Varejo (paralelo • cache automático)
                        </p>
                    </div>
                )}

                {/* DONE */}
                {status === 'done' && veredito && (
                    <div className="space-y-5">
                        {/* Badge do veredito */}
                        <div className={`rounded-xl border-2 p-4 sm:p-5 ${levelConfig[veredito.level].classes} text-center`}>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">{levelConfig[veredito.level].label}</p>
                            <p className="text-3xl sm:text-4xl font-black tabular-nums my-1">
                                {formatCurrency(veredito.totalMercadoEncontrado)}
                            </p>
                            <p className="text-sm font-semibold">
                                {veredito.ratioGlobal >= 0 ? '+' : ''}{(veredito.ratioGlobal * 100).toFixed(1)}% vs planilha
                                <span className="opacity-60 ml-2">({formatCurrency(veredito.totalPlanilhaConferida)})</span>
                            </p>
                        </div>

                        {/* Origem dos preços — ML vs Mercado Geral */}
                        {(veredito.achadoML > 0 || veredito.achadoMarket > 0) && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-xl p-3 flex items-center gap-3">
                                    <div className="text-2xl">🟢</div>
                                    <div>
                                        <p className="text-xl font-black text-emerald-300 tabular-nums leading-none">{veredito.achadoML}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 mt-1">Mercado Livre</p>
                                    </div>
                                </div>
                                <div className="bg-blue-500/5 border border-blue-500/25 rounded-xl p-3 flex items-center gap-3">
                                    <ShoppingBag className="w-5 h-5 text-blue-300" />
                                    <div>
                                        <p className="text-xl font-black text-blue-300 tabular-nums leading-none">{veredito.achadoMarket}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400/80 mt-1">Varejo (Amazon/Magalu/etc)</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Contagens de classificação */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
                                <p className="text-2xl font-black text-emerald-300 tabular-nums">{veredito.verdes}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 mt-0.5">Mercado ≥ Planilha</p>
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
                                <p className="text-2xl font-black text-slate-300 tabular-nums">{veredito.semMercado}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400/80 mt-0.5">Sem rastreio</p>
                            </div>
                        </div>

                        {/* Não-rastreáveis */}
                        {veredito.naoRastreaveis > 0 && (
                            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <HelpCircle size={16} />
                                    <p className="text-xs sm:text-sm">
                                        <span className="font-bold text-slate-300 tabular-nums">{veredito.naoRastreaveis}</span> {veredito.naoRastreaveis === 1 ? 'item' : 'itens'} sem descrição utilizável
                                    </p>
                                </div>
                                <p className="text-[10px] text-slate-500 hidden sm:block">
                                    (excluídos do veredito — texto genérico ou vazio)
                                </p>
                            </div>
                        )}

                        {/* Ações pós-auditoria */}
                        <div className="flex flex-wrap justify-center gap-2 pt-1">
                            {veredito.semMercado > 0 && (
                                <button
                                    onClick={retryUnmatched}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-700/40 hover:bg-slate-600/60 border border-slate-600 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition-all"
                                    title="Refaz busca com termo limpo e relevância mais permissiva (20%)"
                                >
                                    🔄 Reanalisar {veredito.semMercado} {veredito.semMercado === 1 ? 'item' : 'itens'} sem rastreio
                                </button>
                            )}
                            <button
                                onClick={exportDiagnosticCSV}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-700/40 hover:bg-slate-600/60 border border-slate-600 hover:border-blue-500/50 text-slate-300 hover:text-blue-300 transition-all"
                                title="Baixa CSV com origem de cada preço — abre no Excel"
                            >
                                <FlaskConical size={14} />
                                Exportar diagnóstico
                            </button>
                        </div>

                        <p className="text-center text-xs text-slate-500">
                            {veredito.totalAuditados} itens auditados • {veredito.achadoML + veredito.achadoMarket} encontrados ({Math.round((veredito.achadoML + veredito.achadoMarket) / Math.max(veredito.totalAuditados, 1) * 100)}%)
                        </p>
                    </div>
                )}

                {/* RETRYING */}
                {status === 'retrying' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-yellow-300 font-semibold">
                                <Loader2 size={16} className="animate-spin" />
                                Reanalisando {retryProgress.done} de {retryProgress.total} itens
                            </div>
                            <span className="text-2xl font-black text-white tabular-nums">
                                {retryProgress.total > 0 ? Math.round((retryProgress.done / retryProgress.total) * 100) : 0}%
                            </span>
                        </div>
                        <div className="h-2.5 bg-[#0d1117] rounded-full overflow-hidden border border-[#30363d]">
                            <div
                                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-300 shadow-lg shadow-yellow-500/30"
                                style={{ width: `${retryProgress.total > 0 ? (retryProgress.done / retryProgress.total) * 100 : 0}%` }}
                            />
                        </div>
                        <p className="text-xs text-emerald-400 text-center font-semibold">
                            ✓ {retryProgress.found || 0} {(retryProgress.found || 0) === 1 ? 'item encontrado' : 'itens encontrados'} no varejo
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}