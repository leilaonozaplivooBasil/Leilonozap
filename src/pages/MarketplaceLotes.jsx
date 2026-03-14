import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, TrendingUp, AlertCircle, Search, ArrowRight, Star, RefreshCw, X, DollarSign, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

const Auction = base44.entities.Auction;

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

export default function MarketplaceLotes() {
    const [lotes, setLotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [erro, setErro] = useState(null);
    const [busca, setBusca] = useState('');
    const [loteModal, setLoteModal] = useState(null); // lote selecionado para autorizar lance
    const [valorAutorizado, setValorAutorizado] = useState('');
    const [autorizado, setAutorizado] = useState(false);
    const [modeloEscolhido, setModeloEscolhido] = useState(null); // 'A' | 'B' | null
    const [percentualCotas, setPercentualCotas] = useState('');
    const navigate = useNavigate();

    const TAXA_OPERACAO = 0.10;

    const calcDeposito = (val) => {
        const v = parseFloat(String(val).replace(',', '.')) || 0;
        return { valor: v, taxa: v * TAXA_OPERACAO, total: v * (1 + TAXA_OPERACAO) };
    };

    useEffect(() => {
        loadLotes();
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

                                <div className="pt-4 border-t border-[#30363d] flex gap-2">
                                    <button
                                        onClick={() => navigate(createPageUrl('AuctionRoom') + `?id=${lote.id}`)}
                                        className="flex-1 text-xs font-bold text-slate-400 hover:text-white border border-[#30363d] hover:border-slate-500 rounded-lg py-2 transition-colors flex items-center justify-center gap-1"
                                    >
                                        Ver sala <ArrowRight size={12} />
                                    </button>
                                    <button
                                        onClick={() => { setLoteModal(lote); setValorAutorizado(''); setAutorizado(false); setModeloEscolhido(null); setPercentualCotas(''); }}
                                        className="flex-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg py-2 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <DollarSign size={12} /> Autorizar Lance
                                    </button>

                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Modal Autorização de Lance */}
            <AnimatePresence>
                {loteModal && (
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
                            {!autorizado ? (
                                <>
                                    <div className="flex items-start justify-between mb-5">
                                        <div>
                                            <h3 className="font-bold text-white text-lg">Autorizar Lance</h3>
                                            <p className="text-slate-400 text-xs mt-1 line-clamp-1">{loteModal.title}</p>
                                        </div>
                                        <button onClick={() => setLoteModal(null)} className="text-slate-500 hover:text-white transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="bg-[#0d1117] rounded-xl p-4 mb-5 border border-[#30363d]">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Lance atual do lote</p>
                                        <p className="text-2xl font-black text-emerald-400">
                                            {formatCurrency(loteModal.current_price || loteModal.starting_price)}
                                        </p>
                                    </div>

                                    {/* MODELO A / B */}
                                    <div className="mb-5">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Modelo de Participação</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setModeloEscolhido('A')}
                                                className={`p-4 rounded-xl border text-left transition-all ${modeloEscolhido === 'A' ? 'border-blue-500 bg-blue-900/20' : 'border-[#30363d] bg-[#0d1117] hover:border-slate-500'}`}
                                            >
                                                <p className="font-black text-white text-sm mb-1">Modelo A</p>
                                                <p className="text-xs text-slate-400 leading-relaxed">Compra o lote inteiro. Capital 100% seu.</p>
                                            </button>
                                            <button
                                                onClick={() => setModeloEscolhido('B')}
                                                className={`p-4 rounded-xl border text-left transition-all ${modeloEscolhido === 'B' ? 'border-purple-500 bg-purple-900/20' : 'border-[#30363d] bg-[#0d1117] hover:border-slate-500'}`}
                                            >
                                                <p className="font-black text-white text-sm mb-1">Modelo B</p>
                                                <p className="text-xs text-slate-400 leading-relaxed">Divide o capital com outros investidores.</p>
                                            </button>
                                        </div>
                                    </div>

                                    {modeloEscolhido === 'B' && (
                                        <div className="mb-4">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                                Minha participação (%)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="99"
                                                value={percentualCotas}
                                                onChange={e => setPercentualCotas(e.target.value)}
                                                placeholder="Ex: 25"
                                                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-white font-bold focus:outline-none focus:border-purple-500"
                                            />
                                        </div>
                                    )}

                                    {modeloEscolhido && (
                                        <div className="mb-5">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                                Autorizo ir até (R$)
                                            </label>
                                            <input
                                                type="number"
                                                value={valorAutorizado}
                                                onChange={e => setValorAutorizado(e.target.value)}
                                                placeholder="Ex: 25000"
                                                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    )}

                                    {modeloEscolhido && valorAutorizado && parseFloat(valorAutorizado) > 0 && (() => {
                                        const dep = calcDeposito(valorAutorizado);
                                        const pct = modeloEscolhido === 'B' && percentualCotas ? parseFloat(percentualCotas) / 100 : 1;
                                        const depositoProporcional = dep.total * pct;
                                        return (
                                            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 mb-5 space-y-2">
                                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Resumo do Depósito Obrigatório</p>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-400">Modelo escolhido</span>
                                                    <span className="text-white font-semibold">Modelo {modeloEscolhido}</span>
                                                </div>
                                                {modeloEscolhido === 'B' && percentualCotas && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-400">Sua participação</span>
                                                        <span className="text-purple-300 font-semibold">{percentualCotas}%</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-400">Valor máximo autorizado</span>
                                                    <span className="text-white font-semibold">{formatCurrency(dep.valor)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-400">Taxa de operação (10%)</span>
                                                    <span className="text-amber-400 font-semibold">+ {formatCurrency(dep.taxa)}</span>
                                                </div>
                                                <div className="flex justify-between text-base font-black pt-2 border-t border-indigo-500/20">
                                                    <span className="text-white">
                                                        {modeloEscolhido === 'B' && percentualCotas ? 'Sua cota a depositar' : 'Total a depositar'}
                                                    </span>
                                                    <span className="text-indigo-300">{formatCurrency(depositoProporcional)}</span>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <button
                                        disabled={
                                            !modeloEscolhido ||
                                            !valorAutorizado ||
                                            parseFloat(valorAutorizado) <= 0 ||
                                            (modeloEscolhido === 'B' && (!percentualCotas || parseFloat(percentualCotas) <= 0))
                                        }
                                        onClick={() => setAutorizado(true)}
                                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
                                    >
                                        Confirmar Autorização
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="text-emerald-400" size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Autorização Registrada!</h3>
                                    <p className="text-slate-400 text-sm mb-1">
                                        Modelo: <span className="text-white font-bold">Modelo {modeloEscolhido}</span>
                                        {modeloEscolhido === 'B' && percentualCotas && <span className="text-purple-300"> · {percentualCotas}% do lote</span>}
                                    </p>
                                    <p className="text-slate-400 text-sm mb-2">
                                        Valor máximo autorizado: <span className="text-white font-bold">{formatCurrency(parseFloat(valorAutorizado))}</span>
                                    </p>
                                    <p className="text-slate-400 text-sm mb-6">
                                        Total a depositar: <span className="text-indigo-300 font-bold">
                                            {formatCurrency(calcDeposito(valorAutorizado).total * (modeloEscolhido === 'B' && percentualCotas ? parseFloat(percentualCotas) / 100 : 1))}
                                        </span>
                                    </p>
                                    <p className="text-slate-500 text-xs mb-6">Nossa equipe entrará em contato via WhatsApp para confirmar o depósito e sua participação no lote.</p>
                                    <button
                                        onClick={() => { setLoteModal(null); navigate(createPageUrl('CarteiraInvestidor')); }}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors"
                                    >
                                        Ver minha Carteira
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}