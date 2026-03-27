import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, TrendingUp, AlertCircle, Search, Star, RefreshCw, X, DollarSign, CheckCircle2, ArrowLeft, Wallet, ShoppingCart, Users, User } from 'lucide-react';
import LoteReservadoOverlay from '../components/lotes/LoteReservadoOverlay';
import LoteArrematadoOverlay from '../components/lotes/LoteArrematadoOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import ReservaLoteModal from '../components/lotes/ReservaLoteModal';
import ModeloBModal from '../components/lotes/ModeloBModal';

const Auction = base44.entities.Auction;
const AppUser = base44.entities.AppUser;
const LoteCota = base44.entities.LoteCota;
const SystemLog = base44.entities.SystemLog;

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

export default function MarketplaceLotes() {
    const [lotes, setLotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [erro, setErro] = useState(null);
    const [busca, setBusca] = useState('');
    const [loteModal, setLoteModal] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [valorMaxAutorizado, setValorMaxAutorizado] = useState('');
    const [showReservaModal, setShowReservaModal] = useState(false);
    const [pendingCheckoutData, setPendingCheckoutData] = useState(null);
    const [modeloSelecionado, setModeloSelecionado] = useState(null); // 'A' | 'B' | null
    const [showModeloBModal, setShowModeloBModal] = useState(false);
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

    const lotesFiltrados = lotes.filter(l => {
        // Filtro de busca
        if (busca && !l.title?.toLowerCase().includes(busca.toLowerCase())) return false;
        return true;
    });

    const getStatusLabel = (status) => {
        if (status === 'active') return { label: 'Captação Aberta', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
        if (status === 'sold') return { label: 'Arrematado', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
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
                        const isReservedByOther = lote.reserved_by && lote.reserved_by !== currentUser?.id && lote.reserved_until && new Date(lote.reserved_until) > new Date();
                        return (
                            <motion.div
                                key={lote.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 hover:border-blue-500/40 transition-all group relative overflow-hidden"
                            >
                                {lote.status === 'sold' && (
                                    <LoteArrematadoOverlay winnerName={lote.winner_name} />
                                )}
                                {lote.status !== 'sold' && isReservedByOther && (
                                    <LoteReservadoOverlay
                                        reservedUntil={lote.reserved_until}
                                        onExpired={loadLotes}
                                    />
                                )}
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
                                            const pctArr = lote.partner_commission_percentual ?? 0;
                                            const pctAdm = lote.platform_commission_percentual ?? 0;
                                            const taxaDoLote = pctArr + pctAdm;
                                            const tp = taxaDoLote > 0 ? taxaDoLote : (currentUser?.total_operation_fee_percentage || 10);
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
                                    onClick={() => lote.status !== 'sold' && setLoteModal(lote)}
                                    disabled={lote.status === 'sold'}
                                    className={`w-full text-xs font-bold rounded-lg py-2 transition-colors flex items-center justify-center gap-1 ${lote.status === 'sold' ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'text-white bg-emerald-600 hover:bg-emerald-500'}`}
                                >
                                    <ShoppingCart size={12} /> {lote.status === 'sold' ? 'Arrematado' : 'Ver e Comprar Lote'}
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
                    // Calcula taxa total: prioriza taxas salvas no lote, fallback para perfil do investidor
                    const pctArrLote = loteModal.partner_commission_percentual ?? 0;
                    const pctAdmLote = loteModal.platform_commission_percentual ?? 0;
                    const taxaDoLote = pctArrLote + pctAdmLote;
                    const taxaPct = taxaDoLote > 0 ? taxaDoLote : (currentUser?.total_operation_fee_percentage || 10);
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
                                    <button onClick={() => { setLoteModal(null); setValorMaxAutorizado(''); setModeloSelecionado(null); }} className="text-slate-500 hover:text-white transition-colors ml-3 shrink-0">
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

                                {/* ── ESCOLHA DO MODELO ── */}
                                <div className="mb-4">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-3">Como deseja participar?</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Modelo A */}
                                        <button
                                            onClick={() => setModeloSelecionado('A')}
                                            className={`rounded-xl p-4 border-2 text-left transition-all ${
                                                modeloSelecionado === 'A'
                                                    ? 'border-blue-500 bg-blue-900/20'
                                                    : 'border-[#30363d] bg-[#0d1117] hover:border-blue-500/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <User size={16} className="text-blue-400" />
                                                <span className="text-sm font-black text-blue-400">MODELO A</span>
                                                {modeloSelecionado === 'A' && <CheckCircle2 size={14} className="text-blue-400 ml-auto" />}
                                            </div>
                                            <p className="text-[10px] text-slate-400 leading-snug">Compra Individual — Você financia 100% · Lance vai no seu nome</p>
                                        </button>

                                        {/* Modelo B */}
                                        <button
                                            onClick={() => setModeloSelecionado('B')}
                                            className={`rounded-xl p-4 border-2 text-left transition-all ${
                                                modeloSelecionado === 'B'
                                                    ? 'border-violet-500 bg-violet-900/20'
                                                    : 'border-[#30363d] bg-[#0d1117] hover:border-violet-500/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <Users size={16} className="text-violet-400" />
                                                <span className="text-sm font-black text-violet-400">MODELO B</span>
                                                {modeloSelecionado === 'B' && <CheckCircle2 size={14} className="text-violet-400 ml-auto" />}
                                            </div>
                                            <p className="text-[10px] text-slate-400 leading-snug">Dividir este Lote — Divida o risco · Mais investidores podem entrar</p>
                                        </button>
                                    </div>
                                </div>

                                {/* Modelo A: campo de valor máximo */}
                                {modeloSelecionado === 'A' && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-[#0d1117] rounded-xl p-4 mb-4 border border-blue-500/20"
                                >
                                    <label className="block text-xs text-blue-400 uppercase tracking-wider font-bold mb-2">
                                        Até quanto o arrematante pode ir?
                                    </label>
                                    <p className="text-[10px] text-slate-500 mb-3">
                                        Valor mínimo: {formatCurrency(valorTotalInvestimento)}. Informe o teto máximo que você autoriza.
                                    </p>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">R$</span>
                                        <input
                                            type="number"
                                            min={valorTotalInvestimento}
                                            step="100"
                                            value={valorMaxAutorizado}
                                            onChange={e => setValorMaxAutorizado(e.target.value)}
                                            placeholder={valorTotalInvestimento.toFixed(2)}
                                            className="w-full bg-[#161b22] border border-[#30363d] rounded-lg py-2.5 pl-10 pr-3 text-white text-lg font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow placeholder:text-slate-600"
                                        />
                                    </div>
                                    {valorMaxAutorizado && parseFloat(valorMaxAutorizado) < valorTotalInvestimento && (
                                        <p className="text-[10px] text-red-400 mt-1.5">O valor não pode ser menor que o investimento base.</p>
                                    )}
                                </motion.div>
                                )}

                                {/* Saldo do investidor — só mostra se Modelo A selecionado */}
                                {modeloSelecionado === 'A' && (
                                <div className={`rounded-xl p-4 mb-5 border flex items-center gap-3 ${temSaldo ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-amber-900/20 border-amber-500/30'}`}>
                                    <Wallet size={20} className={temSaldo ? 'text-emerald-400' : 'text-amber-400'} />
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider">Seu Saldo Disponível</p>
                                        <p className={`text-lg font-black ${temSaldo ? 'text-emerald-400' : 'text-amber-400'}`}>{formatCurrency(saldoDisponivel)}</p>
                                    </div>
                                    {temSaldo && <CheckCircle2 size={18} className="text-emerald-400 ml-auto" />}
                                </div>
                                )}

                                {/* Modelo A — fluxo original + registro LoteCota */}
                                {modeloSelecionado === 'A' && (() => {
                                    const valorDesejado = parseFloat(valorMaxAutorizado) || valorTotalInvestimento;
                                    const valorFaltante = Math.max(0, valorDesejado - saldoDisponivel);
                                    const saldoSuficiente = valorFaltante <= 0;
                                    return (
                                        <>
                                            {valorDesejado >= valorTotalInvestimento && (
                                                <div className={`rounded-xl p-4 mb-4 border ${saldoSuficiente ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-blue-900/20 border-blue-500/30'}`}>
                                                    {saldoSuficiente ? (
                                                        <div className="flex items-center gap-3">
                                                            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                                                            <div>
                                                                <p className="text-sm font-bold text-emerald-400">Saldo suficiente!</p>
                                                                <p className="text-[10px] text-slate-400 mt-0.5">Você já possui saldo para cobrir este investimento.</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-xs text-blue-400 uppercase tracking-wider font-bold mb-1">Valor do PIX a gerar</p>
                                                                <p className="text-[10px] text-slate-500">{formatCurrency(valorDesejado)} − {formatCurrency(saldoDisponivel)} de saldo</p>
                                                            </div>
                                                            <p className="text-2xl font-black text-blue-400">{formatCurrency(valorFaltante)}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                <button
                                                    onClick={() => { setLoteModal(null); navigate(createPageUrl('VisualizarLote') + `?id=${loteModal.id}`); }}
                                                    className="w-full bg-[#0d1117] border border-[#30363d] hover:border-blue-500 text-slate-300 hover:text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Package size={16} /> Ver Análise do Lote
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const maxVal = parseFloat(valorMaxAutorizado) || valorTotalInvestimento;
                                                        if (maxVal < valorTotalInvestimento) return;
                                                        // Registra LoteCota Modelo A
                                                        try {
                                                            await LoteCota.create({
                                                                lote_id: loteModal.id,
                                                                lote_titulo: loteModal.title,
                                                                investidor_id: currentUser?.id,
                                                                investidor_nome: currentUser?.full_name,
                                                                modelo: 'A',
                                                                percentual_cota: 100,
                                                                valor_autorizado: maxVal,
                                                                taxa_operacao: taxaPct,
                                                                total_deposito: maxVal,
                                                                status: 'reservado',
                                                            });
                                                            // Notifica SystemLog
                                                            SystemLog.create({
                                                                tipo: 'nova_reserva',
                                                                mensagem: `Investidor ${currentUser?.full_name} reservou 100% do lote "${loteModal.title}" — Modelo A`,
                                                                valor: maxVal,
                                                                user_id: currentUser?.id,
                                                                auction_id: loteModal.id,
                                                            }).catch(() => {});
                                                        } catch (_) { /* não bloqueia o fluxo */ }

                                                        const faltante = Math.max(0, maxVal - saldoDisponivel);
                                                        if (faltante <= 0) {
                                                            setLoteModal(null);
                                                            setModeloSelecionado(null);
                                                            navigate(createPageUrl('CarteiraInvestidor'));
                                                            return;
                                                        }
                                                        const checkoutData = { amount: faltante, auctionId: loteModal.id, auctionTitle: loteModal.title };
                                                        setLoteModal(null);
                                                        setModeloSelecionado(null);
                                                        setTimeout(() => {
                                                            setPendingCheckoutData(checkoutData);
                                                            setShowReservaModal(true);
                                                        }, 100);
                                                    }}
                                                    disabled={valorMaxAutorizado && parseFloat(valorMaxAutorizado) < valorTotalInvestimento}
                                                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <DollarSign size={16} /> {saldoSuficiente ? 'Acessar Central' : 'Competir este Lote'}
                                                </button>
                                            </div>
                                        </>
                                    );
                                })()}

                                {/* Modelo B — botão que abre ModeloBModal */}
                                {modeloSelecionado === 'B' && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-3"
                                >
                                    <div className="bg-violet-900/10 border border-violet-500/20 rounded-xl p-4 text-sm text-violet-200/80">
                                        <p className="font-bold text-violet-300 mb-1">👥 Divisão de Capital</p>
                                        <p className="text-xs text-slate-400">Você define qual percentual do lote quer financiar. Outros investidores podem completar o restante.</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const capturedLote = loteModal;
                                            setLoteModal(null);
                                            setModeloSelecionado(null);
                                            setTimeout(() => {
                                                setPendingCheckoutData({ auctionId: capturedLote.id, auctionTitle: capturedLote.title, loteObj: capturedLote, valorTotalLote: valorTotalInvestimento, taxaPct });
                                                setShowModeloBModal(true);
                                            }, 100);
                                        }}
                                        className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Users size={16} /> Definir minha cota neste lote
                                    </button>
                                </motion.div>
                                )}

                                {/* Sem modelo selecionado — nenhuma ação disponível ainda */}
                                {!modeloSelecionado && (
                                    <p className="text-center text-xs text-slate-500 py-2">Selecione um modelo para continuar.</p>
                                )}
                            </motion.div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            {/* Modal de Reserva Temporária (Modelo A) */}
            <ReservaLoteModal
                isOpen={showReservaModal}
                loteTitle={pendingCheckoutData?.auctionTitle}
                auctionId={pendingCheckoutData?.auctionId}
                investorId={currentUser?.id}
                investorName={currentUser?.full_name}
                onClose={(reason) => {
                    setShowReservaModal(false);
                    setPendingCheckoutData(null);
                    if (reason === 'expired' || reason === 'error') loadLotes();
                }}
                onConfirm={() => {
                    setShowReservaModal(false);
                    if (pendingCheckoutData) {
                        navigate(createPageUrl('AuctionCheckoutModern'), {
                            state: {
                                amount: pendingCheckoutData.amount,
                                depositType: 'investor_capital',
                                auctionId: pendingCheckoutData.auctionId,
                                auctionTitle: pendingCheckoutData.auctionTitle,
                                autoSubmitPix: true
                            }
                        });
                    }
                }}
            />

            {/* Modal Modelo B */}
            <AnimatePresence>
                {showModeloBModal && pendingCheckoutData?.loteObj && (
                    <ModeloBModal
                        lote={pendingCheckoutData.loteObj}
                        currentUser={currentUser}
                        valorTotalLote={pendingCheckoutData.valorTotalLote}
                        taxaPct={pendingCheckoutData.taxaPct}
                        onClose={() => {
                            setShowModeloBModal(false);
                            setPendingCheckoutData(null);
                            loadLotes();
                        }}
                        onConfirm={(cotaId, valorFaltante) => {
                            setShowModeloBModal(false);
                            setPendingCheckoutData(null);
                            loadLotes();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}