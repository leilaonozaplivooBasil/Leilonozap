import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, TrendingUp, AlertCircle, Search, ArrowRight, Star, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

const Auction = base44.entities.Auction;

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

export default function MarketplaceLotes() {
    const [lotes, setLotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [erro, setErro] = useState(null);
    const [busca, setBusca] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadLotes();
    }, []);

    const loadLotes = async () => {
        setIsLoading(true);
        setErro(null);
        try {
            // Busca leilões marcados como lote de investimento ou todos ativos
            const data = await Auction.list('-created_date', 100);
            // Filtra apenas os lotes publicados para investimento (status active ou captação)
            const lotesInvestimento = data.filter(a =>
                a.is_investment_plan === true || a.status === 'active'
            );
            setLotes(lotesInvestimento);
        } catch (error) {
            console.error('[MarketplaceLotes] Erro ao carregar lotes:', error);
            setErro('Não foi possível carregar os lotes. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const lotesFiltrados = lotes.filter(l =>
        !busca || l.title?.toLowerCase().includes(busca.toLowerCase())
    );

    const getStatusLabel = (status) => {
        if (status === 'active') return { label: 'Captação Aberta', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
        if (status === 'ended') return { label: 'Encerrado', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
        return { label: status, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    };

    return (
        <div className="min-h-screen bg-[#0d1117] text-slate-200 font-sans p-4 xl:p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <header className="mb-8">
                    <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase">
                        <Star size={14} />
                        Marketplace de Lotes
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                        Lotes disponíveis para <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Investimento</span>
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm">Autorize seu lance e participe dos leilões com a equipe do Leilão no Zap.</p>
                </header>

                {/* Busca + Refresh */}
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar lote por título..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <button
                        onClick={loadLotes}
                        className="bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-2.5 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                {/* Estado de carregamento */}
                {isLoading && (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                )}

                {/* Erro */}
                {erro && (
                    <div className="bg-red-900/20 border border-red-500/40 rounded-xl p-6 flex items-center gap-3">
                        <AlertCircle className="text-red-400 shrink-0" />
                        <p className="text-red-300 text-sm">{erro}</p>
                    </div>
                )}

                {/* Sem resultados */}
                {!isLoading && !erro && lotesFiltrados.length === 0 && (
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-12 text-center">
                        <Package className="text-slate-600 mx-auto mb-4" size={48} />
                        <h3 className="text-slate-400 font-semibold text-lg mb-2">Nenhum lote disponível</h3>
                        <p className="text-slate-500 text-sm">Novos lotes serão publicados em breve. Volte mais tarde.</p>
                    </div>
                )}

                {/* Lista de lotes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {lotesFiltrados.map((lote, idx) => {
                        const st = getStatusLabel(lote.status);
                        return (
                            <motion.div
                                key={lote.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 hover:border-blue-500/40 transition-all group cursor-pointer"
                                onClick={() => navigate(createPageUrl('AuctionRoom') + `?id=${lote.id}`)}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${st.color}`}>
                                        {st.label}
                                    </span>
                                    <ArrowRight size={18} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                                </div>

                                <h3 className="font-bold text-white text-base leading-tight mb-4 line-clamp-2">
                                    {lote.title}
                                </h3>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Lance Atual</p>
                                        <p className="text-lg font-black text-emerald-400">
                                            {formatCurrency(lote.current_price || lote.starting_price)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Encerra em</p>
                                        <p className="text-sm font-semibold text-white">
                                            {lote.end_time
                                                ? new Date(lote.end_time).toLocaleDateString('pt-BR')
                                                : '—'
                                            }
                                        </p>
                                    </div>
                                    {lote.winner_name && (
                                        <div className="col-span-2">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Vencedor</p>
                                            <p className="text-sm font-semibold text-blue-300">{lote.winner_name}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-[#30363d] flex justify-end">
                                    <button className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                                        Ver detalhes <ArrowRight size={12} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
