import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Activity, CheckCircle2, DollarSign, History, ShieldCheck, AlertCircle, TrendingUp, ArrowLeft, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { usePanelVisibility } from '@/hooks/usePanelVisibility';

const AppUser = base44.entities.AppUser;
const Auction = base44.entities.Auction;

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

export default function CarteiraInvestidor() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState(null);
    const [arrematante, setArrematante] = useState(null);
    const [lotesParticipando, setLotesParticipando] = useState([]);
    const [historico, setHistorico] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);

    const pendingDepositAction = searchParams.get('action');
    const pendingAmount = Number(searchParams.get('amount')) || 0;
    const pendingLote = searchParams.get('lote');

    const loadDados = async () => {
        setIsLoading(true);
        try {
            const stored = localStorage.getItem('currentUser');
            if (!stored) return;
            const cachedUser = JSON.parse(stored);

            const users = await AppUser.filter({ email: cachedUser.email });
            if (!users || users.length === 0) return;
            const user = users[0];
            setUsuario(user);

            // Busca arrematante responsável se vinculado
            if (user.arrematante_responsavel_id) {
                AppUser.filter({ id: user.arrematante_responsavel_id }).then(arr => {
                    if (arr?.[0]) setArrematante(arr[0]);
                }).catch(() => {});
            }

            const [auctions, walletTx] = await Promise.all([
                Auction.filter({ winner_id: user.id }),
                base44.entities.WalletTransaction.filter({ user_id: user.id })
            ]);
            setLotesParticipando(auctions || []);
            setHistorico((walletTx || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        } catch (error) {
            console.error('[CarteiraInvestidor] Erro ao carregar dados:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ⚠️ Hooks que dependem de loadDados — DEVEM vir DEPOIS da declaração (evita TDZ)
    useEffect(() => { loadDados(); }, []);

    // 🔄 Refresh ao voltar de outra aba/app (saldos críticos podem ter mudado)
    usePanelVisibility(loadDados, { enabled: !!usuario, throttleMs: 3000 });

    const handleDepositarCapital = () => {
        const loteId = searchParams.get('lote_id');
        navigate(createPageUrl('AuctionCheckoutModern'), {
            state: {
                amount: pendingAmount,
                depositType: 'investor_capital',
                auctionId: loteId || null
            }
        });
    };

    const saldoDisponivel = usuario?.saldo_disponivel ?? 0;
    const saldoAlocado = usuario?.saldo_alocado ?? 0;
    const patrimônioTotal = saldoDisponivel + saldoAlocado;
    const pctAlocado = patrimônioTotal > 0 ? (saldoAlocado / patrimônioTotal) * 100 : 0;

    const getLoteStatusBadge = (status) => {
        if (status === 'active') return { label: 'ATIVO', cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' };
        if (status === 'sold') return { label: 'FINALIZADO', cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' };
        return { label: 'PENDENTE', cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' };
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d1117] text-slate-200 font-sans p-4 xl:p-8 selection:bg-blue-500/30">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <header className="mb-8">
                    <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-widest uppercase">
                        <ShieldCheck size={14} className="fill-emerald-400/20" />
                        Conta Segura — {usuario?.full_name || 'Investidor'}
                    </div>

                    {/* Bloco Arrematante */}
                    {usuario?.role !== 'admin' && usuario?.role !== 'super_admin' && (
                        <div className={`mt-2 mb-4 inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border ${arrematante ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-[#161b22] border-[#30363d]'}`}>
                            <User size={16} className={arrematante ? 'text-emerald-400' : 'text-slate-500'} />
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Seu Arrematante</p>
                                <p className={`text-sm font-bold ${arrematante ? 'text-white' : 'text-slate-500'}`}>
                                    {arrematante ? arrematante.full_name : 'Arrematante não definido'}
                                </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider ${arrematante ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                                {arrematante ? 'ATIVO' : 'N/D'}
                            </span>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
                            <ArrowLeft size={16} /> Voltar
                        </button>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                            Central de Capital e <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Saldo</span>
                        </h1>
                    </div>
                </header>

                {/* Intent de Depósito Pendente */}
                {pendingDepositAction === 'deposit' && pendingAmount > 0 && !showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-indigo-900/40 border border-indigo-500/50 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                        <div className="relative z-10 flex-1">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                                <AlertCircle className="text-indigo-400" />
                                Capital Necessário para Participação
                            </h3>
                            <p className="text-indigo-200/80 text-sm">
                                Para confirmar a autorização de lance no lote <strong>{pendingLote}</strong>, você precisa depositar o capital obrigatório.
                            </p>
                        </div>
                        <div className="relative z-10 shrink-0 w-full md:w-auto bg-[#0d1117] p-5 rounded-xl border border-indigo-500/30 text-center">
                            <span className="block text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Valor do Depósito</span>
                            <span className="block text-3xl font-black text-white mb-4">{formatCurrency(pendingAmount)}</span>
                            <button onClick={handleDepositarCapital} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all flex justify-center items-center gap-2">
                                Realizar Depósito PIX
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Success Alert */}
                {showSuccess && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-emerald-900/30 border border-emerald-500/50 rounded-2xl p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                            <CheckCircle2 className="text-emerald-400" size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-emerald-400 text-lg">Capital Aprovado e Alocado!</h4>
                            <p className="text-emerald-200/70 text-sm">Depósito solicitado. Nossa equipe irá confirmar via WhatsApp.</p>
                        </div>
                    </motion.div>
                )}

                {/* Cards de Saldo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[50px] transition-all group-hover:bg-emerald-500/10"></div>
                        <Wallet className="text-emerald-500 mb-4" size={36} />
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Saldo Disponível (Livre)</p>
                        <p className="text-5xl font-black text-white tracking-tight leading-tight">{formatCurrency(saldoDisponivel)}</p>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => navigate(createPageUrl('AddFunds'))}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20 animate-pulse hover:animate-none">
                                <ArrowDownToLine size={16} /> Depositar
                            </button>
                            <button
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                onClick={() => navigate(createPageUrl('AdminWithdrawals'))}
                                disabled={saldoDisponivel <= 0}>
                                <ArrowUpFromLine size={16} /> Sacar
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <Activity className="text-amber-500 mb-4" size={36} />
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Capital Alocado (Leilões)</p>
                        <p className="text-5xl font-black text-white tracking-tight leading-tight">{formatCurrency(saldoAlocado)}</p>
                        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                            Valor travado em lotes durante o processo de arremate.
                        </p>
                        {/* Barra de progresso */}
                        {patrimônioTotal > 0 && (
                            <div className="mt-4">
                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                    <span>Alocado</span>
                                    <span>{pctAlocado.toFixed(0)}% do total</span>
                                </div>
                                <div className="w-full bg-[#0d1117] rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700"
                                        style={{ width: `${pctAlocado}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl flex flex-col justify-center bg-gradient-to-br from-[#161b22] to-slate-900 border-l-4 border-l-purple-500">
                        <DollarSign className="text-purple-400 mb-4" size={36} />
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Patrimônio Total</p>
                        <p className="text-5xl font-black text-purple-400 tracking-tight leading-tight">{formatCurrency(patrimônioTotal)}</p>
                    </div>
                </div>

                {/* Histórico de Movimentações */}
                {historico.length > 0 && (
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden mt-8">
                        <div className="p-6 border-b border-[#30363d] bg-slate-800/10 flex items-center gap-3">
                            <TrendingUp className="text-slate-400" />
                            <h3 className="font-bold text-white text-lg">Histórico de Movimentações</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#0d1117] text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Descrição</th>
                                        <th className="px-6 py-4">Tipo</th>
                                        <th className="px-6 py-4 text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {historico.map(tx => (
                                        <tr key={tx.id} className="border-b border-[#30363d]/50 hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                                                {new Date(tx.created_date).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4 text-slate-200">{tx.description || '—'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${tx.direction === 'credit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {tx.direction === 'credit' ? 'ENTRADA' : 'SAÍDA'}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${tx.direction === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {tx.direction === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Lotes Arrematados */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden mt-8">
                    <div className="p-6 border-b border-[#30363d] bg-slate-800/10 flex items-center gap-3">
                        <History className="text-slate-400" />
                        <h3 className="font-bold text-white text-lg">Meus Lotes Arrematados</h3>
                        <button onClick={loadDados} className="ml-auto text-slate-500 hover:text-white transition-colors">
                            <RefreshCw size={16} />
                        </button>
                    </div>
                    {lotesParticipando.length === 0 ? (
                        <div className="p-10 text-center text-slate-500 text-sm">Nenhum lote arrematado ainda.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#0d1117] text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                        <th className="px-6 py-4">Lote</th>
                                        <th className="px-6 py-4">Encerramento</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Lance</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {lotesParticipando.map(lote => {
                                        const badge = getLoteStatusBadge(lote.status);
                                        return (
                                            <tr key={lote.id} className="border-b border-[#30363d]/50 hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-200">{lote.title}</td>
                                                <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                                                    {lote.end_time ? new Date(lote.end_time).toLocaleDateString('pt-BR') : '—'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wider ${badge.cls}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-emerald-400">
                                                    {formatCurrency(lote.current_price || lote.starting_price)}
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