import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Package, DollarSign, RefreshCw, Eye, TrendingUp, CheckCircle2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

const Auction = base44.entities.Auction;
const AppUser = base44.entities.AppUser;

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

const LOT_STATUS_LABELS = {
    importado: { label: 'Importado', color: 'bg-slate-500/10 text-slate-400' },
    em_analise: { label: 'Em Análise', color: 'bg-yellow-500/10 text-yellow-400' },
    publicado: { label: 'Publicado', color: 'bg-blue-500/10 text-blue-400' },
    autorizado: { label: 'Autorizado', color: 'bg-indigo-500/10 text-indigo-400' },
    aguardando_pagamento: { label: 'Ag. Pagamento', color: 'bg-orange-500/10 text-orange-400' },
    pagamento_confirmado: { label: 'Pago', color: 'bg-teal-500/10 text-teal-400' },
    arrematado: { label: 'Arrematado', color: 'bg-emerald-500/10 text-emerald-400' },
    finalizado: { label: 'Finalizado', color: 'bg-purple-500/10 text-purple-400' },
    cancelado: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400' },
};

export default function ParceiroLotes() {
    const navigate = useNavigate();
    const [parceiro, setParceiro] = useState(null);
    const [lotes, setLotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('todos');

    useEffect(() => {
        loadDados();
    }, []);

    const loadDados = async () => {
        setIsLoading(true);
        try {
            const stored = localStorage.getItem('currentUser');
            if (!stored) return;
            const cached = JSON.parse(stored);

            // Valida que é leiloeiro
            if (cached.role !== 'leiloeiro' && cached.role !== 'admin') {
                navigate(createPageUrl('Home'));
                return;
            }

            // Busca dados frescos do parceiro
            const users = await AppUser.filter({ email: cached.email });
            if (!users || users.length === 0) return;
            const user = users[0];
            setParceiro(user);

            // Busca apenas lotes associados a este parceiro
            const lotesData = await Auction.filter({
                partner_id: user.id,
                is_investment_plan: true
            });
            setLotes(lotesData || []);
        } catch (err) {
            console.error('[ParceiroLotes] Erro:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const lotesFiltrados = lotes.filter(l => {
        if (filtroStatus === 'todos') return true;
        if (filtroStatus === 'ativos') return l.status === 'active';
        if (filtroStatus === 'sold') return l.status === 'sold';
        return l.lot_status === filtroStatus;
    });

    const totalArrecadado = lotes
        .filter(l => l.status === 'sold')
        .reduce((sum, l) => sum + (l.current_price || l.starting_price || 0), 0);

    const totalComissao = lotes
        .filter(l => l.status === 'sold' && l.partner_commission_percentual)
        .reduce((sum, l) => {
            const val = l.current_price || l.starting_price || 0;
            return sum + (val * (l.partner_commission_percentual / 100));
        }, 0);

    return (
        <div className="min-h-screen bg-[#0d1117] text-slate-200 font-sans p-4 xl:p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <header className="mb-6">
                    <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase">
                        <Package size={14} />
                        Área do Parceiro
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white tracking-tight">
                                Meus <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Lotes</span>
                            </h1>
                            {parceiro && (
                                <p className="text-slate-400 text-sm mt-1">{parceiro.full_name} · {parceiro.address_city || ''} {parceiro.address_state || ''}</p>
                            )}
                        </div>
                        <button onClick={loadDados} className="text-slate-400 hover:text-white border border-[#30363d] rounded-lg p-2 transition-colors">
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </header>

                {/* Métricas do parceiro */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5">
                        <Package className="text-slate-400 mb-3" size={22} />
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total de Lotes</p>
                        <p className="text-2xl font-black text-white">{lotes.length}</p>
                    </div>
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5">
                        <TrendingUp className="text-emerald-400 mb-3" size={22} />
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Volume Arrematado</p>
                        <p className="text-2xl font-black text-emerald-400">{formatCurrency(totalArrecadado)}</p>
                    </div>
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5">
                        <DollarSign className="text-amber-400 mb-3" size={22} />
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Comissão Total Gerada</p>
                        <p className="text-2xl font-black text-amber-400">{formatCurrency(totalComissao)}</p>
                    </div>
                </div>

                {/* Filtros */}
                <div className="flex gap-2 flex-wrap">
                    {['todos', 'ativos', 'sold'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFiltroStatus(f)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${filtroStatus === f ? 'bg-blue-600 text-white' : 'bg-[#161b22] border border-[#30363d] text-slate-400 hover:text-white'}`}
                        >
                            {{ todos: 'Todos', ativos: 'Ativos', sold: 'Arrematados' }[f]}
                        </button>
                    ))}
                </div>

                {/* Tabela de lotes */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
                    {isLoading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                    ) : lotesFiltrados.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 text-sm">Nenhum lote encontrado.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-[#0d1117] text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                        <th className="px-6 py-4">Lote</th>
                                        <th className="px-6 py-4">Lance Final</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Minha Comissão</th>
                                        <th className="px-6 py-4">Vencedor</th>
                                        <th className="px-6 py-4 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lotesFiltrados.map(lote => {
                                        const valorLote = lote.current_price || lote.starting_price || 0;
                                        const pct = lote.partner_commission_percentual || 0;
                                        const valorComissao = valorLote * (pct / 100);
                                        const st = LOT_STATUS_LABELS[lote.lot_status] || { label: lote.status?.toUpperCase() || '—', color: 'bg-slate-500/10 text-slate-400' };

                                        return (
                                            <tr key={lote.id} className="border-b border-[#30363d]/50 hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4 max-w-xs">
                                                    <p className="font-semibold text-white truncate">{lote.title}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {lote.end_time ? new Date(lote.end_time).toLocaleDateString('pt-BR') : '—'}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-emerald-400">
                                                    {formatCurrency(valorLote)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${st.color}`}>
                                                        {st.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {pct > 0 ? (
                                                        <div>
                                                            <span className="text-amber-400 font-bold">{formatCurrency(valorComissao)}</span>
                                                            <span className="text-slate-500 text-xs ml-1">({pct}%)</span>
                                                            {lote.commissions_distributed && (
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    <CheckCircle2 size={10} className="text-emerald-400" />
                                                                    <span className="text-[10px] text-emerald-400">Pago</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-600 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-blue-300 text-xs font-semibold">{lote.winner_name || '—'}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => navigate(createPageUrl('AuctionRoom') + `?id=${lote.id}`)}
                                                        className="text-slate-500 hover:text-blue-400 transition-colors"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}