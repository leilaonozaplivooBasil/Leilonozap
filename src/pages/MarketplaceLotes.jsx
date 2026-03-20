import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, TrendingUp, AlertCircle, Search, Star, RefreshCw, X, DollarSign, CheckCircle2, ArrowLeft, Wallet, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

const Auction = base44.entities.Auction;
const AppUser = base44.entities.AppUser;

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

export default function MarketplaceLotes() {
    const [lotes, setLotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [erro, setErro] = useState(null);
    const [busca, setBusca] = useState('');
    const [loteModal, setLoteModal] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadLotes();
        // Carrega dados atualizados do investidor (saldo)
        const stored = localStorage.getItem('currentUser');
        if (stored) {
            const cached = JSON.parse(stored);
            AppUser.filter({ email: cached.email }).then(users => {
                if (users?.[0]) setCurrentUser(users[0]);
                else setCurrentUser(cached);
            }).catch(() => setCurrentUser(cached));
        }
    }, []);

    const loadLotes = async () => {
        setIsLoading(true);
        setErro(null);
        try {
            // Busca leilões marcados como lote de investimento ou todos ativos
            // Busca direto pelo filtro no banco — só lotes publicados no marketplace
            const lotesInvestimento = await Auction.filter({ is_investment_plan: true });
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
                    <p className="text-slate-400 mt-2 text-sm">Veja os lotes disponíveis e compre diretamente com seu saldo.</p>
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
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-2.5 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                    >
                        <ArrowLeft size={16} /> Voltar
                    </button>
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
                                className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 hover:border-blue-500/40 transition-all group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${st.color}`}>
                                        {st.label}
                                    </span>
                                </div>

                                <h3 className="font-bold text-white text-base leading-tight mb-4 line-clamp-2">
                                    {lote.title}
                                </h3>

                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Investimento Total</p>
                                        {(() => {
                                            const vl = lote.current_price || lote.starting_price || 0;
                                            const tp = currentUser?.total_operation_fee_percentage || 10;
                                            return <p className="text-lg font-black text-emerald-400">{formatCurrency(vl + vl * (tp / 100))}</p>;
                                        })()}
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
                                    {/* ROI estimado (cenário realista 60%) */}
                                    {(lote.market_price || lote.manual_market_price) && (() => {
                                        const vm = lote.market_price || lote.manual_market_price;
                                        const custo = lote.current_price || lote.starting_price;
                                        const projecao60 = vm * 0.60;
                                        const lucro = projecao60 - custo;
                                        const roi = custo > 0 ? (lucro / custo) * 100 : 0;
                                        const roiColor = roi >= 100 ? 'text-emerald-400' : roi >= 50 ? 'text-blue-400' : 'text-amber-400';
                                        return (
                                            <>
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Val. Mercado</p>
                                                    <p className="text-sm font-semibold text-slate-300">{formatCurrency(vm)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">ROI Est. (60%)</p>
                                                    <p className={`text-sm font-black ${roiColor}`}>{roi >= 0 ? '+' : ''}{roi.toFixed(0)}%</p>
                                                </div>
                                            </>
                                        );
                                    })()}
                                    {lote.winner_name && (
                                        <div className="col-span-2">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Vencedor</p>
                                            <p className="text-sm font-semibold text-blue-300">{lote.winner_name}</p>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setLoteModal(lote)}
                                    className="w-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg py-2 transition-colors flex items-center justify-center gap-1"
                                >
                                    <ShoppingCart size={12} /> Ver e Comprar Lote
                                </button>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Modal Compra de Lote */}
            <AnimatePresence>
                {loteModal && (() => {
                    const valorLote = loteModal.current_price || loteModal.starting_price || 0;
                    // Calcula taxa total de operação do investidor
                    const taxaPct = currentUser?.total_operation_fee_percentage || 10;
                    const valorTaxa = valorLote * (taxaPct / 100);
                    const valorTotalInvestimento = valorLote + valorTaxa;
                    const saldoDisponivel = currentUser?.saldo_disponivel ?? 0;
                    const temSaldo = saldoDisponivel >= valorTotalInvestimento;
                    const vm = loteModal.market_price || loteModal.manual_market_price || 0;
                    const roi = (vm > 0 && valorLote > 0) ? (((vm * 0.60) - valorTotalInvestimento) / valorTotalInvestimento * 100) : null;

                    return (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setLoteModal(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                                className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-md shadow-2xl"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-5">
                                    <div>
                                        <h3 className="font-bold text-white text-lg">Detalhes do Lote</h3>
                                        <p className="text-slate-400 text-xs mt-1 line-clamp-2">{loteModal.title}</p>
                                    </div>
                                    <button onClick={() => setLoteModal(null)} className="text-slate-500 hover:text-white transition-colors ml-3 shrink-0">
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Infos do lote */}
                                <div className="grid grid-cols-2 gap-3 mb-5">
                                    <div className="bg-gradient-to-br from-emerald-900/30 to-[#0d1117] rounded-xl p-4 border border-emerald-500/20 col-span-2">
                                        <p className="text-xs text-emerald-400/70 uppercase tracking-wider mb-1 font-bold">Valor Total de Investimento</p>
                                        <p className="text-2xl font-black text-emerald-400">{formatCurrency(valorTotalInvestimento)}</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Inclui taxa de operação de {taxaPct}%</p>
                                    </div>
                                    {vm > 0 && (
                                        <div className="bg-[#0d1117] rounded-xl p-4 border border-[#30363d]">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Val. Mercado</p>
                                            <p className="text-xl font-black text-blue-400">{formatCurrency(vm)}</p>
                                        </div>
                                    )}
                                    {roi !== null && (
                                        <div className="bg-[#0d1117] rounded-xl p-4 border border-[#30363d]">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">ROI Est. (60%)</p>
                                            <p className={`text-xl font-black ${roi >= 100 ? 'text-emerald-400' : roi >= 50 ? 'text-blue-400' : 'text-amber-400'}`}>
                                                {roi >= 0 ? '+' : ''}{roi.toFixed(0)}%
                                            </p>
                                        </div>
                                    )}
                                    {loteModal.end_time && (
                                        <div className="bg-[#0d1117] rounded-xl p-4 border border-[#30363d]">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Encerra em</p>
                                            <p className="text-sm font-bold text-white">{new Date(loteModal.end_time).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Saldo do investidor */}
                                <div className={`rounded-xl p-4 mb-5 border flex items-center gap-3 ${temSaldo ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-amber-900/20 border-amber-500/30'}`}>
                                    <Wallet size={20} className={temSaldo ? 'text-emerald-400' : 'text-amber-400'} />
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider">Seu Saldo Disponível</p>
                                        <p className={`text-lg font-black ${temSaldo ? 'text-emerald-400' : 'text-amber-400'}`}>{formatCurrency(saldoDisponivel)}</p>
                                    </div>
                                    {temSaldo && <CheckCircle2 size={18} className="text-emerald-400 ml-auto" />}
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => { setLoteModal(null); navigate(createPageUrl('VisualizarLote') + `?id=${loteModal.id}`); }}
                                        className="w-full bg-[#0d1117] border border-[#30363d] hover:border-blue-500 text-slate-300 hover:text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Package size={16} /> Ver Análise do Lote
                                    </button>
                                    {temSaldo ? (
                                        <button
                                            onClick={() => {
                                                setLoteModal(null);
                                                navigate(createPageUrl('CarteiraInvestidor') + `?action=deposit&amount=${encodeURIComponent(valorTotalInvestimento)}&lote=${encodeURIComponent(loteModal.title)}&lote_id=${loteModal.id}`);
                                            }}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ShoppingCart size={16} /> Comprar este Lote
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => { setLoteModal(null); navigate(createPageUrl('AddFunds')); }}
                                            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <DollarSign size={16} /> Depositar Saldo
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>
        </div>
    );
}