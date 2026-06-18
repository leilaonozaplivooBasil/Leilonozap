import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ShieldCheck, Loader2, Play, RotateCcw, CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle, Sparkles, FlaskConical } from 'lucide-react';
import { searchMercadoLivre } from '@/functions/searchMercadoLivre';
import { searchGoogleShopping } from '@/functions/searchGoogleShopping';
import { cleanProductTitle, cleanProductTitleAggressive, cleanProductTitleMinimal, hashTitle } from '@/lib/cleanProductTitle';

// Detecta se um item tem descrição utilizável p/ busca de mercado.
// Itens "Item linha N", descrições vazias ou que após limpeza ficam < 3 chars
// NÃO são rastreáveis e não devem entrar como "Sem ML" — entram numa categoria à parte.
function isUntrackable(item) {
    const raw = (item?.desc || '').toString().trim();
    if (!raw || raw.length < 3) return true;
    // Padrões clássicos de planilhas sem descrição real
    if (/^item\s+linha\s+\d+/i.test(raw)) return true;
    if (/^sem\s+descri/i.test(raw)) return true;
    if (/^-+$/.test(raw)) return true;
    // Após limpeza máxima, se sobra menos de 3 chars, é lixo
    const minimal = cleanProductTitleMinimal(raw);
    if (!minimal || minimal.length < 3) return true;
    return false;
}

// Cache v4 — invalidado após migração para searchMercadoLivre (3 camadas)
const CACHE_PREFIX = 'ml_valid_v4_';
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

// Match ML FLEXÍVEL — aceita qualquer indicador de Mercado Livre nos campos do produto
// searchMercadoLivre já retorna SOMENTE produtos do ML (3 camadas filtradas no backend),
// mas mantemos o filtro como guardião extra de qualidade.
function isMLProduct(p) {
    if (!p || typeof p.price !== 'number' || p.price <= 0) return false;
    const hayList = [
        p.source, p.url, p.link, p.permalink, p.mercadolivre_url, p.product_link,
        p?.merchant?.name, p?.seller_name, p?.seller_nickname
    ];
    const hay = hayList.filter(Boolean).join(' ').toLowerCase();
    if (!hay) return false;
    return (
        hay.includes('mercadolivre') ||
        hay.includes('mercado livre') ||
        hay.includes('ml.com') ||
        hay.includes('mlstatic')
    );
}

// Extrai URL de um produto (ML preferencialmente, qualquer URL como fallback)
function extractUrl(p) {
    return p?.permalink || p?.mercadolivre_url || p?.url || p?.link || p?.product_link || null;
}

// Tenta uma busca e retorna {mlProducts, allProducts, term} — sem efeitos colaterais
// Contrato de searchMercadoLivre: response.data = { products, stats, searchUrl }
// products[i] = { title, price, permalink, thumbnail, seller_nickname, ... }
async function attemptSearch(term, signal) {
    if (!term || term.length < 3) return { mlProducts: [], allProducts: [], term, skipped: true };
    try {
        const response = await searchMercadoLivre({ productName: term });
        if (signal?.aborted) return { aborted: true };
        const allProducts = response?.data?.products || [];
        const mlProducts = allProducts.filter(isMLProduct);
        return { mlProducts, allProducts, term };
    } catch (err) {
        return { mlProducts: [], allProducts: [], term, error: err?.message || 'erro' };
    }
}

// CASCATA SÊNIOR — 3 camadas em ordem decrescente de especificidade
// Cada tentativa usa um cleaner diferente. Só dispara a próxima se a anterior
// não trouxe NENHUM ML *e* o termo MUDOU (otimização: evita SerpAPI duplicado).
async function fetchMLForItem(item, signal) {
    const cacheKey = hashTitle(item.desc);
    const cached = readCache(cacheKey);
    if (cached) {
        return { item, cached: true, ...cached };
    }

    const t1 = cleanProductTitle(item.desc);
    const t2 = cleanProductTitleAggressive(item.desc);
    const t3 = cleanProductTitleMinimal(item.desc);

    const debug = { t1, t2, t3, attempts: [] };

    // === Tentativa 1 — Limpeza inteligente ===
    const a1 = await attemptSearch(t1, signal);
    if (a1?.aborted) return null;
    debug.attempts.push({ tier: 1, term: t1, hits: a1.allProducts?.length || 0, ml: a1.mlProducts?.length || 0 });
    if (a1.mlProducts?.length > 0) {
        const primary = a1.mlProducts[0];
        const data = { mlPrice: primary.price, productUrl: extractUrl(primary), tier: 1 };
        writeCache(cacheKey, data);
        return { item, cached: false, debug, ...data };
    }

    // === Tentativa 2 — Marca + Modelo (só se termo MUDOU) ===
    if (t2 && t2 !== t1) {
        const a2 = await attemptSearch(t2, signal);
        if (a2?.aborted) return null;
        debug.attempts.push({ tier: 2, term: t2, hits: a2.allProducts?.length || 0, ml: a2.mlProducts?.length || 0 });
        if (a2.mlProducts?.length > 0) {
            const primary = a2.mlProducts[0];
            const data = { mlPrice: primary.price, productUrl: extractUrl(primary), tier: 2 };
            writeCache(cacheKey, data);
            return { item, cached: false, debug, ...data };
        }
    } else {
        debug.attempts.push({ tier: 2, term: t2 || '', skipped: 'mesmo termo do tier 1' });
    }

    // === Tentativa 3 — Mínimo viável (só se termo MUDOU) ===
    if (t3 && t3 !== t2 && t3 !== t1) {
        const a3 = await attemptSearch(t3, signal);
        if (a3?.aborted) return null;
        debug.attempts.push({ tier: 3, term: t3, hits: a3.allProducts?.length || 0, ml: a3.mlProducts?.length || 0 });
        if (a3.mlProducts?.length > 0) {
            const primary = a3.mlProducts[0];
            const data = { mlPrice: primary.price, productUrl: extractUrl(primary), tier: 3 };
            writeCache(cacheKey, data);
            return { item, cached: false, debug, ...data };
        }
    } else {
        debug.attempts.push({ tier: 3, term: t3 || '', skipped: 'mesmo termo dos tiers anteriores' });
    }

    // Nenhuma das 3 camadas achou ML → no_ml
    const data = { level: 'no_ml' };
    writeCache(cacheKey, data);
    return { item, cached: false, debug, ...data };
}

export default function VereditoMLCard({ itens = [], totalPlanilha = 0 }) {
    const [status, setStatus] = useState('idle'); // idle | auditing | done | retrying
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [results, setResults] = useState([]); // array de {item, mlPrice?, level?, productUrl?}
    const [retryProgress, setRetryProgress] = useState({ done: 0, total: 0, found: 0 });
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

        // 🆕 PRÉ-FILTRO: separa itens sem descrição utilizável (não entram em SerpAPI nem na conta)
        const validItems = itens.filter(i => i && i.desc);
        const untrackableItems = validItems.filter(isUntrackable);
        const itemsToProcess = validItems.filter(i => !isUntrackable(i));
        const total = itemsToProcess.length;

        setStatus('auditing');
        setProgress({ done: 0, total });
        setResults([]);

        // Pré-popula resultados com não-rastreáveis (não vão consumir SerpAPI)
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

    // 🔄 RETRY MERCADO GERAL — busca em Magalu/Amazon/Casas Bahia/Shopee via Google Shopping
    // Diferente do cascade principal (que só busca no ML), aqui aceitamos QUALQUER varejista.
    // Conserto crítico: searchGoogleShopping foi reparado (bug googleShoppingUrl removido).
    const retryNoML = async () => {
        if (status === 'retrying') return;
        const noMlItems = results.filter(r => !r.mlPrice && r.level === 'no_ml');
        if (noMlItems.length === 0) return;

        const controller = new AbortController();
        abortRef.current = controller;

        setStatus('retrying');
        setRetryProgress({ done: 0, total: noMlItems.length, found: 0 });

        let cursor = 0;
        let doneCount = 0;
        let foundCount = 0;
        const updates = new Map();

        const workers = Array.from({ length: Math.min(POOL_SIZE, noMlItems.length) }, async () => {
            while (cursor < noMlItems.length && !controller.signal.aborted) {
                const myIdx = cursor++;
                const r = noMlItems[myIdx];
                // Tenta com o termo de limpeza inteligente — mais robusto para varejo geral
                const term = cleanProductTitle(r.item.desc) || cleanProductTitleMinimal(r.item.desc);
                if (!term || term.length < 3) {
                    doneCount++;
                    setRetryProgress({ done: doneCount, total: noMlItems.length, found: foundCount });
                    continue;
                }
                try {
                    // 🆕 GOOGLE SHOPPING GERAL — pega Magalu, Amazon, Casas Bahia, Shopee, etc.
                    const response = await searchGoogleShopping({ productName: term });
                    if (controller.signal.aborted) return;
                    const products = (response?.data?.products || [])
                        .filter(p => p && typeof p.price === 'number' && p.price > 0);
                    if (products.length > 0) {
                        const primary = products[0];
                        const data = {
                            mlPrice: primary.price,
                            productUrl: primary.url || null,
                            tier: 'market',
                            store: primary.store || null,
                        };
                        try {
                            localStorage.setItem(
                                CACHE_PREFIX + hashTitle(r.item.desc),
                                JSON.stringify({ savedAt: Date.now(), data })
                            );
                        } catch { /* ignora */ }
                        updates.set(r.item.desc, { ...r, ...data, level: undefined });
                        foundCount++;
                    }
                } catch { /* falha individual não bloqueia */ }
                doneCount++;
                setRetryProgress({ done: doneCount, total: noMlItems.length, found: foundCount });
            }
        });

        await Promise.all(workers);
        if (controller.signal.aborted) return;

        if (updates.size > 0) {
            setResults(prev => prev.map(r => updates.get(r.item.desc) || r));
        }
        setStatus('done');
    };

    // 🔬 Exporta CSV de diagnóstico — uma linha por item com os termos tentados
    const exportDiagnosticCSV = () => {
        if (!results || results.length === 0) return;
        const escape = (v) => {
            if (v === null || v === undefined) return '';
            const s = String(v).replace(/"/g, '""');
            return /[",\n;]/.test(s) ? `"${s}"` : s;
        };
        const header = [
            'desc_original', 'tentativa_1', 'tentativa_2', 'tentativa_3',
            'tier_acertou', 'preco_ml', 'ml_url', 'resultado'
        ].join(',');
        const lines = results.map(r => {
            const d = r.debug || {};
            const tierLabel = r.tier === 'market' ? 'mercado geral' : (r.tier || '');
            const resultado = r.mlPrice ? 'ENCONTRADO' : 'SEM ML';
            return [
                escape(r.item?.desc),
                escape(d.t1 || ''),
                escape(d.t2 || ''),
                escape(d.t3 || ''),
                escape(tierLabel),
                escape(r.mlPrice ?? ''),
                escape(r.productUrl || ''),
                escape(resultado),
            ].join(',');
        });
        const csv = '\uFEFF' + [header, ...lines].join('\n'); // BOM p/ Excel ler UTF-8
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

    // Agregações do veredito
    const veredito = useMemo(() => {
        if (status !== 'done' || results.length === 0) return null;

        let totalMLEncontrado = 0;
        let totalPlanilhaConferida = 0;
        let verdes = 0, amarelos = 0, vermelhos = 0, semML = 0, naoRastreaveis = 0;

        for (const r of results) {
            // 🆕 Itens sem descrição utilizável vão para categoria separada
            if (r.level === 'untrackable') {
                naoRastreaveis++;
                continue;
            }
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
            verdes, amarelos, vermelhos, semML, naoRastreaveis,
            totalAuditados: results.length - naoRastreaveis,
        };
    }, [results, status]);

    const levelConfig = {
        ok:      { Icon: CheckCircle2, classes: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300', label: '🟢 VEREDITO: LOTE VALIDADO' },
        warn:    { Icon: AlertTriangle, classes: 'bg-yellow-500/10 border-yellow-500/40 text-yellow-300', label: '🟡 VEREDITO: MARGEM APERTADA' },
        alert:   { Icon: AlertOctagon, classes: 'bg-red-500/10 border-red-500/40 text-red-300', label: '🔴 VEREDITO: PLANILHA SUPERFATURADA' },
        unknown: { Icon: HelpCircle, classes: 'bg-slate-500/10 border-slate-500/40 text-slate-300', label: '❓ VEREDITO: DADOS INSUFICIENTES' },
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

                        {/* 🆕 Não-rastreáveis — só aparece se houver, separado da contagem principal */}
                        {veredito.naoRastreaveis > 0 && (
                            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <HelpCircle size={16} />
                                    <p className="text-xs sm:text-sm">
                                        <span className="font-bold text-slate-300 tabular-nums">{veredito.naoRastreaveis}</span> {veredito.naoRastreaveis === 1 ? 'item' : 'itens'} sem descrição utilizável
                                    </p>
                                </div>
                                <p className="text-[10px] text-slate-500 hidden sm:block">
                                    (excluídos do veredito — sem texto para buscar)
                                </p>
                            </div>
                        )}

                        {/* Ações pós-auditoria */}
                        <div className="flex flex-wrap justify-center gap-2 pt-1">
                            {veredito.semML > 0 && (
                                <button
                                    onClick={retryNoML}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-700/40 hover:bg-slate-600/60 border border-slate-600 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition-all"
                                    title="Busca em Magalu, Amazon, Casas Bahia, Shopee e outros varejistas via Google Shopping"
                                >
                                    🔄 Buscar {veredito.semML} {veredito.semML === 1 ? 'item' : 'itens'} em Magalu / Amazon / Casas Bahia
                                </button>
                            )}
                            <button
                                onClick={exportDiagnosticCSV}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-700/40 hover:bg-slate-600/60 border border-slate-600 hover:border-blue-500/50 text-slate-300 hover:text-blue-300 transition-all"
                                title="Baixa um CSV com cada item e os termos de busca usados — abre no Excel"
                            >
                                <FlaskConical size={14} />
                                Exportar diagnóstico
                            </button>
                        </div>

                        {/* Rodapé com metadado */}
                        <p className="text-center text-xs text-slate-500">
                            {veredito.totalAuditados} itens auditados • para conferir item-a-item, abra cada grade abaixo
                        </p>
                    </div>
                )}

                {/* Estado RETRYING — progresso do retry no mercado geral */}
                {status === 'retrying' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-yellow-300 font-semibold">
                                <Loader2 size={16} className="animate-spin" />
                                Buscando {retryProgress.done} de {retryProgress.total} em Magalu / Amazon / Casas Bahia
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
                            ✓ {retryProgress.found || 0} {(retryProgress.found || 0) === 1 ? 'item encontrado' : 'itens encontrados'} no varejo geral
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}