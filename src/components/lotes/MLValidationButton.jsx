import React, { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, AlertOctagon, Search, ExternalLink } from 'lucide-react';
import { searchMercadoLivre } from '@/functions/searchMercadoLivre';
import { searchGoogleShopping } from '@/functions/searchGoogleShopping';
import { cleanProductTitle, cleanProductTitleAggressive, cleanProductTitleMinimal, hashTitle } from '@/lib/cleanProductTitle';

const CACHE_PREFIX = 'ml_valid_v4_'; // v4: mediana dos top 10 da API oficial do ML
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_RESULTS = 3; // mínimo de anúncios pra confiar na mediana

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
    // Semântica de arremate: ML caro = bom (margem); ML barato = alerta (planilha superfaturada)
    const ratio = (mlPrice - valorPlanilha) / valorPlanilha;
    if (ratio >= 0) return 'ok';
    if (ratio >= -0.15) return 'warn';
    return 'alert';
}

// Tenta API oficial do ML com um termo. Retorna {mlPrice, productUrl, stats} ou null.
async function tryMLApi(term) {
    if (!term || term.length < 3) return null;
    try {
        const response = await searchMercadoLivre({ productName: term, limit: 10 });
        const stats = response?.data?.stats;
        const products = response?.data?.products || [];
        if (!stats || !stats.count || stats.count < MIN_RESULTS) return null;
        const topProduct = products[0];
        return {
            mlPrice: stats.median,
            productUrl: topProduct?.permalink || response?.data?.searchUrl || null,
            stats,
        };
    } catch {
        return null;
    }
}

// Fallback p/ SerpAPI (rede de segurança se API ML cair)
async function tryGoogleShopping(term) {
    if (!term || term.length < 3) return null;
    try {
        const response = await searchGoogleShopping({ productName: term });
        const results = response?.data?.products || [];
        const mlProducts = results.filter(r => {
            if (!r || typeof r.price !== 'number' || r.price <= 0) return false;
            const isMLSource = typeof r.source === 'string' && r.source.toLowerCase().includes('mercado livre');
            return isMLSource || !!r.mercadolivre_url;
        });
        if (mlProducts.length === 0) return null;
        const primary = mlProducts[0];
        return {
            mlPrice: primary.price,
            productUrl: primary.mercadolivre_url || primary.url || null,
            stats: { count: mlProducts.length, median: primary.price, source: 'serpapi' },
        };
    } catch {
        return null;
    }
}

export default function MLValidationButton({ descricao, valorPlanilha }) {
    const cacheKey = hashTitle(descricao);
    const [state, setState] = useState(() => {
        const cached = readCache(cacheKey);
        if (!cached) return { status: 'idle' };
        if (cached.level === 'no_ml') return { status: 'no_ml' };
        return { status: 'done', ...cached };
    });
    const abortRef = useRef(null);

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

        // Cascata: API ML em 3 termos → SerpAPI como rede de segurança
        const terms = [
            cleanProductTitle(descricao),
            cleanProductTitleAggressive(descricao),
            cleanProductTitleMinimal(descricao),
        ].filter((t, i, arr) => t && t.length >= 3 && arr.indexOf(t) === i); // unique + válidos

        if (terms.length === 0) {
            setState({ status: 'error', message: 'Título muito curto' });
            return;
        }

        let result = null;

        // === Camadas 1-3: API oficial do ML ===
        for (const term of terms) {
            if (controller.signal.aborted) return;
            result = await tryMLApi(term);
            if (result) break;
        }

        // === Camada 4 (fallback): SerpAPI com termo principal ===
        if (!result && !controller.signal.aborted) {
            result = await tryGoogleShopping(terms[0]);
        }

        if (controller.signal.aborted) return;

        if (!result) {
            writeCache(cacheKey, { level: 'no_ml' });
            setState({ status: 'no_ml' });
            return;
        }

        const level = getDivergenceLevel(valorPlanilha, result.mlPrice);
        const data = {
            mlPrice: result.mlPrice,
            level,
            count: result.stats?.count || 1,
            productUrl: result.productUrl,
            p25: result.stats?.p25 ?? null,
            p75: result.stats?.p75 ?? null,
        };
        writeCache(cacheKey, data);
        setState({ status: 'done', ...data });
    };

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

    if (state.status === 'loading') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-400">
                <Loader2 size={12} className="animate-spin" />
                Buscando...
            </span>
        );
    }

    if (state.status === 'no_ml') {
        const termoBusca = cleanProductTitle(descricao) || descricao;
        const mlSearchUrl = `https://lista.mercadolivre.com.br/${encodeURIComponent(termoBusca)}`;
        return (
            <a
                href={mlSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Buscar manualmente no Mercado Livre"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold border bg-slate-500/10 border-slate-500/30 text-slate-400 hover:bg-slate-500/20 hover:border-slate-400 hover:text-slate-200 min-h-[32px] transition-colors cursor-pointer no-underline"
            >
                <Search size={12} />
                Sem ML
                <ExternalLink size={11} className="opacity-60" />
            </a>
        );
    }

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

    // === Estado DONE — mediana com tooltip de faixa ===
    const { mlPrice, level, productUrl, count, p25, p75 } = state;
    const config = {
        ok:      { Icon: CheckCircle2, classes: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' },
        warn:    { Icon: AlertTriangle, classes: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20' },
        alert:   { Icon: AlertOctagon, classes: 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' },
        unknown: { Icon: AlertTriangle, classes: 'bg-slate-500/10 border-slate-500/30 text-slate-400 hover:bg-slate-500/20' },
    }[level] || { Icon: AlertTriangle, classes: 'bg-slate-500/10 border-slate-500/30 text-slate-400' };
    const { Icon } = config;

    const tooltip = (p25 && p75)
        ? `Mediana de ${count} anúncios — faixa típica: ${formatCurrency(p25)} a ${formatCurrency(p75)}`
        : `Baseado em ${count} ${count === 1 ? 'anúncio' : 'anúncios'} do Mercado Livre`;

    const content = (
        <>
            <Icon size={12} />
            <span className="tabular-nums">{formatCurrency(mlPrice)}</span>
            {productUrl && <ExternalLink size={11} className="opacity-70" />}
        </>
    );

    const baseClasses = `inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold border min-h-[32px] transition-colors ${config.classes}`;

    if (productUrl) {
        return (
            <a
                href={productUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={tooltip}
                className={`${baseClasses} cursor-pointer no-underline`}
            >
                {content}
            </a>
        );
    }

    return <span className={baseClasses} title={tooltip}>{content}</span>;
}