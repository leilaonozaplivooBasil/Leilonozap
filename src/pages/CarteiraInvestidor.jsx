import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Activity, CheckCircle2, DollarSign, History, ShieldCheck, AlertCircle, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;
const Auction = base44.entities.Auction;

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

export default function CarteiraInvestidor() {
    const [searchParams] = useSearchParams();
    const [usuario, setUsuario] = useState(null);
    const [lotesParticipando, setLotesParticipando] = useState([]);
    const [historico, setHistorico] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingDeposit, setIsProcessingDeposit] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const pendingDepositAction = searchParams.get('action');
    const pendingAmount = Number(searchParams.get('amount')) || 0;
    const pendingLote = searchParams.get('lote');

    useEffect(() => {
        loadDados();
    }, []);

    const loadDados = async () => {
        setIsLoading(true);
        try {
            const stored = localStorage.getItem('currentUser');
            if (!stored) return;
            const cachedUser = JSON.parse(stored);

            // Usa email como chave confiável (id do localStorage pode ser stale)
            const users = await AppUser.filter({ email: cachedUser.email });
            if (!users || users.length === 0) return;
            const user = users[0];
            setUsuario(user);

            // Busca lotes arrematados pelo ID real do banco
            const [auctions, walletTx] = await Promise.all([
                Auction.filter({ winner_id: user.id }),
                base44.entities.WalletTransaction.filter({ user_id: user.id })
            ]);
            setLotesParticipando(auctions || []);
            // Ordena do mais recente ao mais antigo
            setHistorico((walletTx || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        } catch (error) {
            console.error('[CarteiraInvestidor] Erro ao carregar dados:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSimulatePayment = () => {
        setIsProcessingDeposit(true);
        const timer = setTimeout(() => {
            setIsProcessingDeposit(false);
            setShowSuccess(true);
        }, 2000);
        // Garante limpeza do timer se componente desmontar
        return () => clearTimeout(timer);
    };

    const saldoDisponivel = usuario?.saldo_disponivel ?? 0;
    const saldoAlocado = usuario?.saldo_alocado ?? 0;
    const patrimônioTotal = saldoDisponivel + saldoAlocado;

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

                {/* Header Carteira */}
                <header className="mb-8">
                    <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-widest uppercase">
                        <ShieldCheck size={14} className="fill-emerald-400/20" />
                        Conta Segura — {usuario?.full_name || 'Investidor'}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                        Sistema de Capital e <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Saldo</span>
                    </h1>
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
                            <button
                                onClick={handleSimulatePayment}
                                disabled={isProcessingDeposit}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all flex justify-center items-center gap-2"
                            >
                                {isProcessingDeposit ? (
                                    <><RefreshCw className="animate-spin" size={18} /> Processando...</>
                                ) : (
                                    <>Realizar Depósito PIX</>
                                )}
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

                {/* Dashboards de Saldo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[50px] transition-all group-hover:bg-emerald-500/10"></div>
                        <Wallet className="text-emerald-500 mb-4" size={28} />
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Saldo Disponível (Livre)</p>
                        <p className="text-4xl font-black text-white tracking-tight">{formatCurrency(saldoDisponivel)}</p>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => alert('Entre em contato com nossa equipe pelo WhatsApp para realizar um depósito.')}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors flex justify-center items-center gap-2">
                                <ArrowDownToLine size={16} /> Depositar
                            </button>
                            <button
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors flex justify-center items-center gap-2"
                                onClick={() => alert('Entre em contato com nossa equipe pelo WhatsApp para solicitar um saque.')}
                                disabled={saldoDisponivel <= 0}>
                                <ArrowUpFromLine size={16} /> Sacar
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <Activity className="text-amber-500 mb-4" size={28} />
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Capital Alocado (Leilões)</p>
                        <p className="text-4xl font-black text-white tracking-tight">{formatCurrency(saldoAlocado)}</p>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                            Valor travado em lotes durante o processo de arremate.
                        </p>
                    </div>

                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl flex flex-col justify-center bg-gradient-to-br from-[#161b22] to-slate-900 border-l-4 border-l-purple-500">
                        <h3 className="font-bold text-lg text-white mb-2 flex items-center gap-2"><DollarSign className="text-purple-400" size={20} /> Patrimônio Total</h3>
                        <p className="text-3xl font-black text-purple-400">{formatCurrency(patrimônioTotal)}</p>
                    </div>
                </div>

                {/* Lotes Participando */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden mt-8">
                    <div className="p-6 border-b border-[#30363d] bg-slate-800/10 flex items-center gap-3">
                        <History className="text-slate-400" />
                        <h3 className="font-bold text-white text-lg">Meus Lotes Arrematados</h3>
                        <button onClick={loadDados} className="ml-auto text-slate-500 hover:text-white transition-colors">
                            <RefreshCw size={16} />
                        </button>
                    </div>
                    {lotesParticipando.length === 0 ? (
                        <div className="p-10 text-center text-slate-500 text-sm">
                            Nenhum lote arrematado ainda.
                        </div>
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
                                    {lotesParticipando.map(lote => (
                                        <tr key={lote.id} className="border-b border-[#30363d]/50 hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-200">{lote.title}</td>
                                            <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                                                {lote.end_time ? new Date(lote.end_time).toLocaleDateString('pt-BR') : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${lote.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                    {lote.status === 'active' ? 'ATIVO' : 'FINALIZADO'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-emerald-400">
                                                {formatCurrency(lote.current_price || lote.starting_price)}
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