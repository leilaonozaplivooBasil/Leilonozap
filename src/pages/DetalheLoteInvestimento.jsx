import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, AlertCircle, Wallet, ArrowLeft, ChevronRight, CheckCircle2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function DetalheLoteInvestimento() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [autorizacaoLance, setAutorizacaoLance] = useState('25000');
    const [modeloAtuacao, setModeloAtuacao] = useState('A'); // 'A' (Lote Inteiro) ou 'B' (Cotas)
    const [showConfirm, setShowConfirm] = useState(false);

    // Mock static data to represent the lot that was clicked
    const lote = {
        id: searchParams.get('id') || 'lote-rj-02',
        titulo: "LOTE 35, 32 e 27 - (Março'26) - Rio de Janeiro RJ02",
        qtdItens: 1323,
        vmTotal: 120297.18,
        ticketMedio: 90.93,
        custoEstimadoMinimo: 18000.00,
        custoEstimadoMaximo: 27000.00,
    };

    const taxaLeilaoPct = 10;

    // Calculations
    const lanceMaximo = Number(autorizacaoLance) || 0;
    const taxaLeilaoCalculada = (lanceMaximo * taxaLeilaoPct) / 100;
    const depositoObrigatorio = lanceMaximo + taxaLeilaoCalculada;

    const lucroEstimadoMin = (lote.vmTotal * 0.5) - depositoObrigatorio;
    const lucroEstimadoMedio = (lote.vmTotal * 0.6) - depositoObrigatorio;
    const rentabilidade = depositoObrigatorio > 0 ? (lucroEstimadoMedio / depositoObrigatorio) * 100 : 0;

    const handleConfirmar = () => {
        // In a real flow, this would lock the authorization and move to a payment/deposit intent
        navigate('/CarteiraInvestidor?action=deposit&amount=' + depositoObrigatorio + '&lote=' + lote.id);
    };

    return (
        <div className="min-h-screen bg-[#0d1117] text-slate-200 font-sans selection:bg-blue-500/30 pb-20">

            {/* Topbar Nav */}
            <div className="border-b border-[#30363d] bg-[#161b22] sticky top-0 z-10 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/MarketplaceLotes')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
                    >
                        <ArrowLeft size={16} /> Voltar ao Marketplace
                    </button>
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                        <span>Exploração</span> <ChevronRight size={14} /> <span className="text-white">Participação</span>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 mt-8">

                {/* Lote Header */}
                <div className="bg-gradient-to-r from-[#161b22] to-[#0d1117] border border-[#30363d] rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden mb-8">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold tracking-widest uppercase">
                            <Package size={14} /> Estratégia de Arremate
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-6 leading-tight max-w-2xl">
                            {lote.titulo}
                        </h1>

                        <div className="flex flex-wrap gap-6 text-sm">
                            <div className="flex flex-col">
                                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">Volume do Lote</span>
                                <span className="font-semibold text-lg text-slate-300">{lote.qtdItens} itens</span>
                            </div>
                            <div className="w-px h-10 bg-[#30363d] hidden sm:block"></div>
                            <div className="flex flex-col">
                                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">Potencial Mercado</span>
                                <span className="font-bold text-lg text-emerald-400">{formatCurrency(lote.vmTotal)}</span>
                            </div>
                            <div className="w-px h-10 bg-[#30363d] hidden sm:block"></div>
                            <div className="flex flex-col">
                                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">Ticket Médio Avaliado</span>
                                <span className="font-semibold text-lg text-slate-300">{formatCurrency(lote.ticketMedio)}/unid</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Form & Models */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* Modelo de Atuação */}
                        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 sm:p-8 shadow-xl">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                1. Selecione o Modelo de Participação
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label
                                    className={`relative cursor-pointer flex flex-col p-5 rounded-xl border-2 transition-all block w-full ${modeloAtuacao === 'A'
                                            ? 'bg-indigo-900/20 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                                            : 'bg-[#0d1117] border-[#30363d] hover:border-slate-600'
                                        }`}
                                >
                                    <input type="radio" name="modelo" value="A" className="sr-only" checked={modeloAtuacao === 'A'} onChange={() => setModeloAtuacao('A')} />
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-lg text-white">Modelo A</span>
                                        {modeloAtuacao === 'A' && <CheckCircle2 size={20} className="text-indigo-400" />}
                                    </div>
                                    <p className="text-sm font-semibold text-indigo-300 mb-2">Lote Inteiro</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">Você adquire o lote 100% sozinho. O valor investido e os retornos pertencem integralmente à sua carteira.</p>
                                </label>

                                <label
                                    className={`relative flex flex-col p-5 rounded-xl border-2 transition-all block w-full opacity-50 cursor-not-allowed ${modeloAtuacao === 'B'
                                            ? 'bg-purple-900/20 border-purple-500'
                                            : 'bg-[#0d1117] border-[#30363d]'
                                        }`}
                                    title="Em breve"
                                >
                                    <input type="radio" name="modelo" value="B" className="sr-only" disabled />
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-lg text-white">Modelo B</span>
                                        <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Em Breve</span>
                                    </div>
                                    <p className="text-sm font-semibold text-purple-300 mb-2">Cotas Coletivas</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">Divida a captação com outros investidores. O capital necessário e os lucros são percentualizados.</p>
                                </label>
                            </div>
                        </div>

                        {/* Autorização de Lance */}
                        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 sm:p-8 shadow-xl">
                            <h2 className="text-xl font-bold text-white mb-2">
                                2. Autorize o Lance Máximo
                            </h2>
                            <p className="text-sm text-slate-400 mb-6 pb-6 border-b border-[#30363d]">
                                Até qual valor nossa equipe pode arrematar este lote por você? Se arrematarmos por menos, a diferença retorna como saldo livre na sua conta.
                            </p>

                            <div className="space-y-4">
                                <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider">
                                    Valor Máximo do Lance (BRL)
                                </label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-500 group-focus-within:text-indigo-400 transition-colors">R$</span>
                                    <input
                                        type="number"
                                        value={autorizacaoLance}
                                        onChange={(e) => setAutorizacaoLance(e.target.value)}
                                        className="w-full bg-[#0d1117] border-2 border-[#30363d] focus:border-indigo-500 rounded-xl py-4 pl-12 pr-4 text-2xl font-black text-white outline-none transition-all shadow-inner"
                                    />
                                </div>

                                <div className="flex items-start gap-3 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl">
                                    <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-300/80 leading-relaxed">
                                        O lote está estimado para fechar entre <strong className="text-blue-300">{formatCurrency(lote.custoEstimadoMinimo)}</strong> e <strong className="text-blue-300">{formatCurrency(lote.custoEstimadoMaximo)}</strong>. Se o seu limite for competitivo, as chances de sucesso aumentam drasticamente.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Checkout Recibo */}
                    <div className="lg:col-span-5 relative">
                        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden sticky top-24">
                            <div className="p-6 bg-[#0d1117] border-b border-[#30363d]">
                                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                    <Wallet className="text-indigo-400" /> Depósito Exigido
                                </h3>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-sm">Lance Autorizado</span>
                                    <span className="font-semibold text-white">{formatCurrency(lanceMaximo)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-sm flex items-center gap-1">
                                        Taxa da Operação (10%)
                                    </span>
                                    <span className="font-semibold text-white">{formatCurrency(taxaLeilaoCalculada)}</span>
                                </div>

                                <div className="pt-4 border-t border-[#30363d]">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-slate-200 font-bold uppercase tracking-wider text-sm">Total a Transferir</span>
                                        <span className="text-3xl font-black text-white">{formatCurrency(depositoObrigatorio)}</span>
                                    </div>
                                    <p className="text-[11px] text-right text-slate-500 font-medium">* O valor entra como saldo na sua conta.</p>
                                </div>
                            </div>

                            {/* Box de Rentabilidade Baseado no Lance */}
                            <div className="mx-6 mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                                <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-3">Retorno Estimado (Caso arremate no máximo)</h4>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Lucro Conservador (50%)</span>
                                        <span className="font-semibold text-slate-200">{formatCurrency(lucroEstimadoMin)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Lucro Realista (60%)</span>
                                        <span className="font-bold text-emerald-400">{formatCurrency(lucroEstimadoMedio)}</span>
                                    </div>
                                    <div className="mt-2 text-right">
                                        <span className="text-[10px] uppercase text-emerald-500/70 font-bold tracking-widest border border-emerald-500/20 px-2 py-0.5 rounded">
                                            ROI Realista: {rentabilidade.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-[#0d1117] border-t border-[#30363d]">
                                <button
                                    onClick={() => setShowConfirm(true)}
                                    disabled={lanceMaximo < 1000}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                                >
                                    Depositar e Autorizar Lance
                                </button>
                            </div>

                        </div>
                    </div>

                </div>

            </div>

            {/* Modal de Confirmação */}
            <AnimatePresence>
                {showConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setShowConfirm(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-3xl p-8 shadow-2xl"
                        >
                            <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertCircle className="text-blue-400" size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-white text-center mb-2">Confirmar Intenção</h3>
                            <p className="text-slate-400 text-center text-sm mb-8">
                                Você será redirecionado para depositar <strong>{formatCurrency(depositoObrigatorio)}</strong> na sua carteira. Este valor ficará <strong>bloqueado</strong> para o leilão do lote "{lote.titulo}".
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="flex-1 py-3 px-4 bg-transparent border border-[#30363d] text-slate-300 font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmar}
                                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-colors"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
