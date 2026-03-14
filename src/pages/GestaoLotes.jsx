import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, RefreshCw, Search, Eye, CheckCircle2, XCircle, Package, Users, DollarSign, Gavel } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

const Auction = base44.entities.Auction;
const AppUser = base44.entities.AppUser;

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

export default function GestaoLotes() {
    const [lotes, setLotes] = useState([]);
    const [investidores, setInvestidores] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [busca, setBusca] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('todos');
    const [isSaving, setIsSaving] = useState(null); // id do lote sendo atualizado
    const navigate = useNavigate();

    useEffect(() => {
        loadDados();
    }, []);

    const loadDados = async () => {
        setIsLoading(true);
        try {
            const [loteData, invData] = await Promise.all([
                Auction.list('-created_date', 100),
                AppUser.filter({ role: 'investidor' })
            ]);
            setLotes(loteData || []);
            setInvestidores(invData || []);
        } catch (err) {
            console.error('[GestaoLotes] Erro:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleInvestmentPlan = async (lote) => {
        setIsSaving(lote.id);
        try {
            await Auction.update(lote.id, { is_investment_plan: !lote.is_investment_plan });
            setLotes(prev => prev.map(l => l.id === lote.id ? { ...l, is_investment_plan: !l.is_investment_plan } : l));
        } catch (err) {
            console.error('[GestaoLotes] Erro ao atualizar:', err);
        } finally {
            setIsSaving(null);
        }
    };

    const registrarArremate = async (lote, vencedorId) => {
        if (!vencedorId) return;
        const vencedor = investidores.find(i => i.id === vencedorId);
        if (!vencedor) return;
        setIsSaving(lote.id);
        try {
            await Auction.update(lote.id, {
                status: 'sold',
                winner_id: vencedor.id,
                winner_name: vencedor.full_name,
                order_status: 'paid'
            });
            setLotes(prev => prev.map(l => l.id === lote.id ? {
                ...l, status: 'sold', winner_id: vencedor.id, winner_name: vencedor.full_name
            } : l));
        } catch (err) {
            console.error('[GestaoLotes] Erro ao registrar arremate:', err);
        } finally {
            setIsSaving(null);
        }
    };

    const lotesFiltrados = lotes.filter(l => {
        const matchBusca = !busca || l.title?.toLowerCase().includes(busca.toLowerCase());
        const matchStatus = filtroStatus === 'todos'
            || (filtroStatus === 'marketplace' && l.is_investment_plan)
            || (filtroStatus === 'active' && l.status === 'active')
            || (filtroStatus === 'sold' && l.status === 'sold');
        return matchBusca && matchStatus;
    });

    const statsInvestidores = investidores.length;
    const lotesMarketplace = lotes.filter(l => l.is_investment_plan).length;
    const lotesSold = lotes.filter(l => l.status === 'sold').length;

    return (
        <div className="min-h-screen bg-[#0d1117] text-slate-200 font-sans p-4 xl:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <header className="mb-6">
                    <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-widest uppercase">
                        <Gavel size={14} />
                        Painel Administrativo
                    </div>
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                            Gestão de <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Lotes</span>
                        </h1>
                        <div className="flex gap-2">
                            <button onClick={loadDados} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm border border-[#30363d] rounded-lg px-3 py-2 transition-colors">
                                <RefreshCw size={14} />
                            </button>
                            <button
                                onClick={() => navigate(createPageUrl('CreateAuction'))}
                                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-lg px-4 py-2 transition-colors"
                            >
                                <Plus size={14} /> Novo Lote
                            </button>
                        </div>
                    </div>
                </header>

                {/* Métricas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total de Lotes', value: lotes.length, icon: Package, color: 'text-slate-400' },
                        { label: 'No Marketplace', value: lotesMarketplace, icon: DollarSign, color: 'text-blue-400' },
                        { label: 'Arrematados', value: lotesSold, icon: CheckCircle2, color: 'text-emerald-400' },
                        { label: 'Investidores', value: statsInvestidores, icon: Users, color: 'text-violet-400' },
                    ].map((m, i) => (
                        <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5">
                            <m.icon className={`${m.color} mb-3`} size={22} />
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{m.label}</p>
                            <p className="text-2xl font-black text-white">{m.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar lote por título..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        {['todos', 'active', 'marketplace', 'sold'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFiltroStatus(f)}
                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${filtroStatus === f ? 'bg-amber-600 text-white' : 'bg-[#161b22] border border-[#30363d] text-slate-400 hover:text-white'}`}
                            >
                                {{ todos: 'Todos', active: 'Ativos', marketplace: 'Marketplace', sold: 'Arrematados' }[f]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabela */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
                    {isLoading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-10 h-10 border-4 border-slate-700 border-t-amber-500 rounded-full animate-spin" />
                        </div>
                    ) : lotesFiltrados.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 text-sm">Nenhum lote encontrado.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-[#0d1117] text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                        <th className="px-6 py-4">Lote</th>
                                        <th className="px-6 py-4">Lance Atual</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-center">Marketplace</th>
                                        <th className="px-6 py-4">Vencedor / Registrar</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lotesFiltrados.map(lote => (
                                        <tr key={lote.id} className="border-b border-[#30363d]/50 hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 max-w-xs">
                                                <p className="font-semibold text-white truncate">{lote.title}</p>
                                                <p className="text-xs text-slate-500">
                                                    {lote.end_time ? new Date(lote.end_time).toLocaleDateString('pt-BR') : '—'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-emerald-400">
                                                {formatCurrency(lote.current_price || lote.starting_price)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${
                                                    lote.status === 'active' ? 'bg-emerald-500/10 text-emerald-400'
                                                    : lote.status === 'sold' ? 'bg-blue-500/10 text-blue-400'
                                                    : 'bg-slate-500/10 text-slate-400'
                                                }`}>
                                                    {lote.status === 'active' ? 'ATIVO' : lote.status === 'sold' ? 'ARREMATADO' : lote.status?.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => toggleInvestmentPlan(lote)}
                                                    disabled={isSaving === lote.id}
                                                    className="transition-colors"
                                                    title={lote.is_investment_plan ? 'Remover do marketplace' : 'Publicar no marketplace'}
                                                >
                                                    {lote.is_investment_plan
                                                        ? <CheckCircle2 size={20} className="text-emerald-400" />
                                                        : <XCircle size={20} className="text-slate-600 hover:text-slate-400" />
                                                    }
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                {lote.winner_name ? (
                                                    <span className="text-blue-300 text-xs font-semibold">{lote.winner_name}</span>
                                                ) : lote.status === 'active' ? (
                                                    <select
                                                        onChange={e => e.target.value && registrarArremate(lote, e.target.value)}
                                                        defaultValue=""
                                                        className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                                                    >
                                                        <option value="">Registrar arremate...</option>
                                                        {investidores.map(inv => (
                                                            <option key={inv.id} value={inv.id}>{inv.full_name}</option>
                                                        ))}
                                                    </select>
                                                ) : <span className="text-slate-600 text-xs">—</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => navigate(createPageUrl('AuctionRoom') + `?id=${lote.id}`)}
                                                    className="text-slate-500 hover:text-amber-400 transition-colors"
                                                >
                                                    <Eye size={16} />
                                                </button>
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
    );
}