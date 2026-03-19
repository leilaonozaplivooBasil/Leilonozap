import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Package, CheckCircle2, BarChart3, TrendingUp, Activity, AlertCircle, AlertTriangle, DollarSign, MapPin, Users, Percent } from 'lucide-react';

const Auction = base44.entities.Auction;
const AppUser = base44.entities.AppUser;

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

export default function VisualizarLote() {
    const navigate = useNavigate();
    const [lote, setLote] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [parceiro, setParceiro] = useState(null);
    const [investidores, setInvestidores] = useState([]);
    const perfilRef = useRef(null);
    const distribuicaoRef = useRef(null);

    const urlParams = new URLSearchParams(window.location.search);
    const loteId = urlParams.get('id');

    useEffect(() => {
        if (!loteId) { navigate(-1); return; }
        Auction.filter({ id: loteId }).then(async (data) => {
            const l = data?.[0] || null;
            setLote(l);
            // Carrega dados do parceiro (arrematante/leiloeiro) vinculado ao lote
            if (l?.partner_id) {
                const partners = await AppUser.filter({ id: l.partner_id });
                if (partners?.[0]) {
                    setParceiro(partners[0]);
                    // Carrega investidores vinculados a este arrematante
                    const invs = await AppUser.filter({ role: 'investidor', referred_by_id: l.partner_id });
                    setInvestidores(invs || []);
                }
            }
        }).finally(() => setIsLoading(false));
    }, [loteId]);

    // Parseia a description do lote (salva como texto pela AnaliseDeLotes)
    const loteMeta = useMemo(() => {
        if (!lote?.description) return { localRetirada: null, totalItens: null, valorMercadoText: null };
        const lines = lote.description.split('\n');
        const get = (prefix) => {
            const line = lines.find(l => l.startsWith(prefix));
            return line ? line.replace(prefix, '').trim() : null;
        };
        return {
            localRetirada: get('Local de Retirada:'),
            totalItens: get('Total de Itens:'),
            valorMercadoText: get('Valor de Mercado:'),
        };
    }, [lote]);

    // Parseia o JSON de categorias salvo na publicação
    const categorias = useMemo(() => {
        if (!lote?.lot_categories_json) return [];
        try { return JSON.parse(lote.lot_categories_json); } catch { return []; }
    }, [lote]);

    const calculations = useMemo(() => {
        if (!lote) return null;

        const custoTotal = lote.starting_price || 0;
        const vm = lote.market_price || lote.manual_market_price || 0;
        const totalItens = parseInt(loteMeta?.totalItens) || 0;

        const projCurto = vm * 0.50;
        const projMedio = vm * 0.60;
        const projLongo = vm * 0.70;

        const lucroEstimado = projMedio - custoTotal;
        const rentabilidade = custoTotal > 0 ? (lucroEstimado / custoTotal) * 100 : 0;

        const ticketMedio = totalItens > 0 ? vm / totalItens : 0;
        const custoMedio = totalItens > 0 ? custoTotal / totalItens : 0;

        let score = { label: 'INDEFINIDO', color: 'bg-slate-600', border: 'border-slate-500', text: 'text-slate-400', icon: null };
        if (custoTotal > 0 && vm > 0) {
            if (rentabilidade >= 200) score = { label: 'EXCELENTE', color: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', icon: <TrendingUp className="text-emerald-400" /> };
            else if (rentabilidade >= 120) score = { label: 'BOM', color: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', icon: <Activity className="text-blue-400" /> };
            else if (rentabilidade >= 80) score = { label: 'MÉDIO', color: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', icon: <AlertCircle className="text-yellow-400" /> };
            else score = { label: 'ARRISCADO', color: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', icon: <AlertTriangle className="text-red-400" /> };
        }

        return { custoTotal, vm, totalItens, projCurto, projMedio, projLongo, lucroEstimado, rentabilidade, score, ticketMedio, custoMedio };
    }, [lote, loteMeta]);

    if (isLoading) return (
        <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );

    if (!lote) return (
        <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-slate-400">
            Lote não encontrado.
        </div>
    );

    const vm = calculations?.vm || 0;

    return (
        <div className="min-h-screen bg-[#0d1117] text-slate-200 p-4 font-sans selection:bg-blue-500/30">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <header className="mb-10 text-center flex flex-col items-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs transition-colors"
                    >
                        <ArrowLeft size={14} /> Voltar
                    </button>
                    <div className="inline-flex items-center gap-3 mb-3 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 shadow-sm">
                        <BarChart3 size={18} className="text-blue-400" />
                        <span className="text-sm font-semibold tracking-wide text-slate-300">AVALIADOR INTELIGENTE DE LEILÕES</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-blue-300 via-indigo-400 to-purple-500 mb-4 pb-1">
                        Análise Estratégica
                    </h1>
                </header>

                <div className="space-y-6">

                    {/* Cabeçalho do Lote */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                                <Package className="text-blue-500" size={24} />
                                {lote.title}
                            </h2>
                            <p className="text-slate-400 text-sm flex items-center gap-2 mb-2">
                                <CheckCircle2 size={14} className="text-emerald-500" /> Lote publicado no marketplace
                            </p>
                            {loteMeta.localRetirada && (
                                <div className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 bg-blue-900/30 border border-blue-800/50 rounded-md text-xs text-blue-300 font-medium">
                                    <MapPin size={12} /> {loteMeta.localRetirada}
                                </div>
                            )}
                        </div>
                        <div className="shrink-0 text-right">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Encerramento</p>
                            <p className="text-sm font-semibold text-white">
                                {lote.end_time ? new Date(lote.end_time).toLocaleString('pt-BR') : '—'}
                            </p>
                        </div>
                    </div>

                    {/* Score Banner */}
                    {calculations && vm > 0 && (
                        <div className={`p-4 rounded-2xl border ${calculations.score.border} ${calculations.score.color} flex items-center gap-4 shadow-lg`}>
                            <div className="p-3 bg-black/20 rounded-xl backdrop-blur-sm">
                                {calculations.score.icon}
                            </div>
                            <div>
                                <h4 className={`font-bold tracking-tight text-lg ${calculations.score.text}`}>SCORE: {calculations.score.label}</h4>
                                <p className="text-slate-300 text-sm">Rentabilidade projetada em cenário médio (60%): <span className="font-bold text-white">{calculations.rentabilidade.toFixed(1)}%</span></p>
                            </div>
                        </div>
                    )}

                    {/* KPIs — igual ao AnaliseDeLotes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
                        {[
                            { label: "Total de Itens (Qtd)", val: calculations?.totalItens || '—', color: "border-l-blue-500", scrollTo: distribuicaoRef },
                            { label: "Valor de Mercado Total", val: formatCurrency(vm), color: "border-l-emerald-500" },
                            { label: "Ticket Médio (Mercado)", val: calculations?.ticketMedio > 0 ? formatCurrency(calculations.ticketMedio) : '—', color: "border-l-indigo-500" },
                            { label: "Custo Total do Lote", val: formatCurrency(lote.starting_price), color: "border-l-amber-500", scrollTo: perfilRef },
                            { label: "Custo Médio p/ Unidade", val: calculations?.custoMedio > 0 ? formatCurrency(calculations.custoMedio) : '—', color: "border-l-red-500" },
                        ].map((kpi, i) => (
                            <div
                                key={i}
                                onClick={() => kpi.scrollTo?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                className={`bg-[#161b22] p-6 rounded-2xl border border-[#30363d] border-l-4 ${kpi.color} shadow-lg ${kpi.scrollTo ? 'cursor-pointer hover:bg-[#1c2230] transition-colors' : ''}`}
                            >
                                <p className="text-slate-400 text-xs font-bold mb-1 tracking-wider uppercase">{kpi.label}</p>
                                <p className="text-3xl font-black tracking-tight text-slate-200">{kpi.val}</p>
                                {kpi.scrollTo && <p className="text-[10px] text-slate-600 mt-1">Clique para ver detalhes ↓</p>}
                            </div>
                        ))}
                    </div>

                    {/* Cenário Financeiro (READ-ONLY) + Projeções — igual ao AnaliseDeLotes */}
                    {calculations && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                            {/* Col 1: Financeiro Read-Only */}
                            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
                                <div className="p-5 border-b border-[#30363d] bg-slate-800/20">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <DollarSign size={18} className="text-amber-400" />
                                        Cenário Financeiro e Custos
                                    </h3>
                                </div>
                                <div className="p-5 space-y-4">
                                    {[
                                        { label: 'Valor Arremato', val: formatCurrency(calculations.custoTotal), highlight: true },
                                        { label: 'Custo Total do Lote', val: formatCurrency(calculations.custoTotal) },
                                        { label: 'Valor de Mercado Total', val: formatCurrency(vm) },
                                        { label: 'Lucro Estimado (60%)', val: formatCurrency(calculations.lucroEstimado) },
                                        { label: 'Rentabilidade Estimada', val: `${calculations.rentabilidade.toFixed(1)}%` },
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center bg-[#0d1117] p-3 rounded-xl border border-[#30363d]">
                                            <span className="text-sm text-slate-400">{item.label}</span>
                                            <span className={`font-bold ${item.highlight ? 'text-amber-400 text-xl' : 'text-white'}`}>{item.val}</span>
                                        </div>
                                    ))}
                                    {/* Status e Vencedor */}
                                    <div className="pt-3 border-t border-[#30363d] space-y-2">
                                        <div className="flex justify-between items-center bg-[#0d1117] p-3 rounded-xl border border-[#30363d]">
                                            <span className="text-sm text-slate-400">Status</span>
                                            <span className={`font-bold text-sm px-2 py-0.5 rounded ${lote.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : lote.status === 'sold' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-500/10 text-slate-400'}`}>
                                                {lote.status === 'active' ? 'ATIVO' : lote.status === 'sold' ? 'ARREMATADO' : lote.status?.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center bg-[#0d1117] p-3 rounded-xl border border-[#30363d]">
                                            <span className="text-sm text-slate-400">Lance Atual</span>
                                            <span className="font-bold text-blue-400">{formatCurrency(lote.current_price || lote.starting_price)}</span>
                                        </div>
                                        {lote.winner_name && (
                                            <div className="flex justify-between items-center bg-[#0d1117] p-3 rounded-xl border border-[#30363d]">
                                                <span className="text-sm text-slate-400">Vencedor</span>
                                                <span className="font-bold text-purple-400 text-sm">{lote.winner_name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Col 2-3: Projeções */}
                            <div className="xl:col-span-2 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl p-6">
                                <h3 className="font-bold text-white mb-5 uppercase tracking-wider text-sm flex items-center gap-2">
                                    <TrendingUp size={16} className="text-indigo-400" />
                                    Cenários de Venda da Grade Útil
                                </h3>
                                <div className="space-y-3">
                                    {[
                                        { title: "Venda (50% do Valor Mercado)", val: calculations.projCurto, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
                                        { title: "Venda (60% do Valor Mercado)", val: calculations.projMedio, color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
                                        { title: "Venda (70% do Valor Mercado)", val: calculations.projLongo, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
                                    ].map((item, idx) => (
                                        <div key={idx} className={`flex justify-between items-center p-4 rounded-xl border ${item.color}`}>
                                            <p className="font-semibold text-sm sm:text-base">{item.title}</p>
                                            <div className="text-right">
                                                <p className="font-bold text-lg sm:text-xl">{formatCurrency(item.val)}</p>
                                                <p className="text-xs mt-0.5 font-medium flex items-center justify-end gap-1">
                                                    <span>Lucro Bruto:</span>
                                                    <span>{formatCurrency(item.val - calculations.custoTotal)}</span>
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Ticket Médio por Grade (se tiver totalItens) */}
                                {calculations.totalItens > 0 && vm > 0 && (
                                    <div className="mt-6 pt-5 border-t border-[#30363d]">
                                        <h4 className="font-bold text-white mb-3 uppercase tracking-wider text-xs flex items-center gap-2">
                                            <Activity size={14} className="text-blue-400" />
                                            Ticket Médio por Cenário
                                        </h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { label: "50% do VM", val: calculations.projCurto / calculations.totalItens, color: "text-blue-400" },
                                                { label: "60% do VM", val: calculations.projMedio / calculations.totalItens, color: "text-indigo-400" },
                                                { label: "70% do VM", val: calculations.projLongo / calculations.totalItens, color: "text-purple-400" },
                                            ].map((t, i) => (
                                                <div key={i} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 text-center">
                                                    <p className="text-xs text-slate-500 mb-1">{t.label}</p>
                                                    <p className={`font-bold text-sm ${t.color}`}>{formatCurrency(t.val)}</p>
                                                    <p className="text-[10px] text-slate-600 mt-0.5">por unidade</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Distribuição Departamental */}
                    {categorias.length > 0 && (
                        <div ref={distribuicaoRef} className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden scroll-mt-24">
                            <div className="p-5 border-b border-[#30363d] bg-slate-800/20">
                                <h3 className="font-bold text-white uppercase tracking-wider text-sm">Distribuição Departamental (Resumo Oficial)</h3>
                                <p className="text-xs text-slate-400 mt-1">Visão macrostática das categorias do lote.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-[#0d1117] border-b border-[#30363d] text-slate-400 uppercase tracking-wider">
                                            <th className="px-6 py-4 font-semibold text-xs">Categoria / Departamento</th>
                                            <th className="px-6 py-4 font-semibold text-xs border-l border-[#30363d] w-32 text-center">Quantidade</th>
                                            <th className="px-6 py-4 font-semibold text-xs border-l border-[#30363d] w-48 text-right">Valor de Avaliação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categorias.map((cat, i) => (
                                            <tr key={i} className="border-b border-[#30363d]/50 hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-300">{cat.nome}</td>
                                                <td className="px-6 py-4 border-l border-[#30363d]/50 text-center text-slate-400">{cat.qtd} un</td>
                                                <td className="px-6 py-4 border-l border-[#30363d]/50 text-right font-bold text-emerald-400">{formatCurrency(cat.valor)}</td>
                                            </tr>
                                        ))}
                                        {/* Linha Total Geral clicável */}
                                        <tr
                                            className="bg-[#0d1117] border-t-2 border-[#30363d] cursor-pointer hover:bg-slate-800/50 transition-colors"
                                            onClick={() => perfilRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                        >
                                            <td className="px-6 py-4 font-bold text-white text-base">Total Geral</td>
                                            <td className="px-6 py-4 border-l border-[#30363d]/50 text-center font-bold text-white">
                                                {categorias.reduce((sum, c) => sum + (c.qtd || 0), 0)} un
                                                <span className="block text-[10px] text-slate-500 mt-0.5">Clique → Perfil Comissões ↓</span>
                                            </td>
                                            <td className="px-6 py-4 border-l border-[#30363d]/50 text-right font-black text-emerald-400 text-base">
                                                {formatCurrency(categorias.reduce((sum, c) => sum + (c.valor || 0), 0))}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Perfil Arrematante e Investidor — Comissões em Cascata */}
                    <div ref={perfilRef} className="scroll-mt-24 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
                        <div className="p-5 border-b border-[#30363d] bg-gradient-to-r from-violet-900/20 to-indigo-900/20">
                            <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                                <Users size={16} className="text-violet-400" />
                                Perfil Arrematante & Investidor — Comissões em Cascata
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">Estrutura de taxas aplicadas ao lote de investimento.</p>
                        </div>
                        <div className="p-6 space-y-6">

                            {/* Arrematante / Parceiro */}
                            <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                                        <Users size={18} className="text-violet-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-base">Arrematante (Leiloeiro)</h4>
                                        <p className="text-xs text-slate-500">{parceiro?.full_name || lote.partner_name || 'Não vinculado'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Taxa Plataforma (Admin)</p>
                                        <p className="text-xl font-black text-violet-400 flex items-center gap-1">
                                            <Percent size={14} /> {parceiro?.partner_plan_amount ?? lote.platform_commission_percentual ?? '—'}%
                                        </p>
                                    </div>
                                    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Comissão Arrematante</p>
                                        <p className="text-xl font-black text-emerald-400 flex items-center gap-1">
                                            <Percent size={14} /> {lote.partner_commission_percentual ?? '—'}%
                                        </p>
                                    </div>
                                    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">E-mail</p>
                                        <p className="text-sm font-medium text-slate-300 truncate">{parceiro?.email || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Investidores vinculados */}
                            <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                        <DollarSign size={18} className="text-amber-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-base">Investidores Vinculados</h4>
                                        <p className="text-xs text-slate-500">{investidores.length} investidor(es) deste arrematante</p>
                                    </div>
                                </div>

                                {investidores.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-4">Nenhum investidor cadastrado por este arrematante.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-sm">
                                            <thead>
                                                <tr className="bg-[#161b22] text-slate-400 text-xs uppercase tracking-wider">
                                                    <th className="px-4 py-3">Investidor</th>
                                                    <th className="px-4 py-3 text-center">Taxa Arrematante</th>
                                                    <th className="px-4 py-3 text-center">Taxa Admin</th>
                                                    <th className="px-4 py-3 text-center">Taxa Total</th>
                                                    <th className="px-4 py-3 text-right">Saldo Livre</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {investidores.map(inv => (
                                                    <tr key={inv.id} className="border-t border-[#30363d]/50 hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-4 py-3">
                                                            <p className="font-semibold text-white">{inv.full_name}</p>
                                                            <p className="text-[11px] text-slate-500">{inv.email}</p>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-emerald-400">
                                                            {inv.arrematante_commission_percentage ?? 0}%
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-violet-400">
                                                            {(parceiro?.partner_plan_amount ?? 0)}%
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-black text-amber-400">
                                                            {inv.total_operation_fee_percentage ?? ((parceiro?.partner_plan_amount ?? 0) + (inv.arrematante_commission_percentage ?? 0))}%
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-slate-300">
                                                            {formatCurrency(inv.saldo_disponivel)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}