import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Package, CheckCircle2, BarChart3, TrendingUp, Activity, AlertCircle, AlertTriangle, DollarSign, MapPin, Hash, List } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const Auction = base44.entities.Auction;

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

export default function VisualizarLote() {
    const navigate = useNavigate();
    const [lote, setLote] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const urlParams = new URLSearchParams(window.location.search);
    const loteId = urlParams.get('id');

    useEffect(() => {
        if (!loteId) { navigate(-1); return; }
        Auction.filter({ id: loteId }).then(data => {
            setLote(data?.[0] || null);
        }).finally(() => setIsLoading(false));
    }, [loteId]);

    const calculations = useMemo(() => {
        if (!lote) return null;

        const custoTotal = lote.starting_price || 0;
        const vm = lote.market_price || lote.manual_market_price || 0;

        const projCurto = vm * 0.50;
        const projMedio = vm * 0.60;
        const projLongo = vm * 0.70;

        const lucroEstimado = projMedio - custoTotal;
        const rentabilidade = custoTotal > 0 ? (lucroEstimado / custoTotal) * 100 : 0;

        let score = { label: 'INDEFINIDO', color: 'bg-slate-600', border: 'border-slate-500', text: 'text-slate-400', icon: null };
        if (custoTotal > 0 && vm > 0) {
            if (rentabilidade >= 200) score = { label: 'EXCELENTE', color: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', icon: <TrendingUp className="text-emerald-400" /> };
            else if (rentabilidade >= 120) score = { label: 'BOM', color: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', icon: <Activity className="text-blue-400" /> };
            else if (rentabilidade >= 80) score = { label: 'MÉDIO', color: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', icon: <AlertCircle className="text-yellow-400" /> };
            else score = { label: 'ARRISCADO', color: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', icon: <AlertTriangle className="text-red-400" /> };
        }

        return { custoTotal, vm, projCurto, projMedio, projLongo, lucroEstimado, rentabilidade, score };
    }, [lote]);

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
        <div className="min-h-screen bg-[#0d1117] text-slate-200 p-4 font-sans">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <header className="mb-10 text-center flex flex-col items-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs transition-colors"
                    >
                        <ArrowLeft size={14} /> Voltar ao CRM
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
                            {lote.description && (
                                <p className="text-xs text-slate-500 mt-1 max-w-xl">{lote.description}</p>
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

                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
                        {[
                            { label: "Custo do Lote (Lance Inicial)", val: formatCurrency(lote.starting_price), color: "border-l-amber-500" },
                            { label: "Lance Atual", val: formatCurrency(lote.current_price || lote.starting_price), color: "border-l-blue-500" },
                            { label: "Valor de Mercado", val: formatCurrency(vm), color: "border-l-emerald-500" },
                            { label: "Status", val: lote.status === 'active' ? 'ATIVO' : lote.status === 'sold' ? 'ARREMATADO' : lote.status?.toUpperCase(), color: "border-l-indigo-500" },
                            { label: "Vencedor", val: lote.winner_name || '—', color: "border-l-purple-500" },
                        ].map((kpi, i) => (
                            <div key={i} className={`bg-[#161b22] p-6 rounded-2xl border border-[#30363d] border-l-4 ${kpi.color} shadow-lg`}>
                                <p className="text-slate-400 text-xs font-bold mb-1 tracking-wider uppercase">{kpi.label}</p>
                                <p className="text-2xl font-black tracking-tight text-slate-200">{kpi.val}</p>
                            </div>
                        ))}
                    </div>

                    {/* Cenário Financeiro (READ-ONLY) + Projeções */}
                    {vm > 0 && calculations && (
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
                                        { label: 'Custo do Lote', val: formatCurrency(calculations.custoTotal), highlight: true },
                                        { label: 'Valor de Mercado Total', val: formatCurrency(vm) },
                                        { label: 'Lucro Estimado (60%)', val: formatCurrency(calculations.lucroEstimado) },
                                        { label: 'Rentabilidade Estimada', val: `${calculations.rentabilidade.toFixed(1)}%` },
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center bg-[#0d1117] p-3 rounded-xl border border-[#30363d]">
                                            <span className="text-sm text-slate-400">{item.label}</span>
                                            <span className={`font-bold ${item.highlight ? 'text-amber-400 text-lg' : 'text-white'}`}>{item.val}</span>
                                        </div>
                                    ))}
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
                                            <p className="font-semibold text-sm">{item.title}</p>
                                            <div className="text-right">
                                                <p className="font-bold text-xl">{formatCurrency(item.val)}</p>
                                                <p className="text-xs mt-0.5 font-medium">
                                                    Lucro Bruto: {formatCurrency(item.val - calculations.custoTotal)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}