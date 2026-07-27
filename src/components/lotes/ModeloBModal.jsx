import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle2, X, DollarSign, Loader2, ArrowRight, Copy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import CotasProgressBar from './CotasProgressBar';
import { toast } from 'sonner';

const LoteCota = base44.entities.LoteCota;
const SystemLog = base44.entities.SystemLog;

const formatCurrency = (val) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

/**
 * ModeloBModal
 * Modal completo do fluxo Modelo B (Divisão de Capital).
 *
 * Props:
 *   lote             — objeto Auction
 *   currentUser      — AppUser logado
 *   valorTotalLote   — number: custo total base do lote (lance + taxa)
 *   taxaPct          — number: percentual de taxa do lote
 *   onClose          — fn(): fecha o modal
 *   onConfirm        — fn(cotaId, valorFaltante): pós-confirmação (ir pro checkout se precisar)
 */
export default function ModeloBModal({ lote, currentUser, valorTotalLote, taxaPct, onClose, onConfirm }) {
    const navigate = useNavigate();

    // Cotas
    const [cotasReservadas, setCotasReservadas] = useState(0); // % já reservado por outros
    const [percentualInput, setPercentualInput] = useState(10); // % que o usuário quer
    const [maxDisponivel, setMaxDisponivel] = useState(100);

    // UI
    const [step, setStep] = useState('escolher'); // 'escolher' | 'confirmando' | 'confirmado'
    const [isSaving, setIsSaving] = useState(false);
    const [cotaSalva, setCotaSalva] = useState(null); // LoteCota salvo

    const saldoDisponivel = currentUser?.saldo_disponivel ?? 0;

    // Quando as cotas carregam via CotasProgressBar
    const handleCotasLoaded = useCallback((totalReservado) => {
        setCotasReservadas(totalReservado);
        const disp = Math.max(0, 100 - totalReservado);
        setMaxDisponivel(disp);
        // Inicializa o slider com min(10, disponivel)
        setPercentualInput(Math.min(10, disp));
    }, []);

    // Percentual seguro (não ultrapassa disponível)
    const percentualSafe = Math.min(Math.max(1, percentualInput), maxDisponivel);

    // Valores calculados com base na cota escolhida
    const valorMinhaCota = (valorTotalLote * percentualSafe) / 100;
    const valorFaltante = Math.max(0, valorMinhaCota - saldoDisponivel);
    const saldoSuficiente = valorFaltante <= 0;

    const handleSliderChange = (e) => {
        setPercentualInput(parseFloat(e.target.value));
    };

    const handleInputChange = (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) setPercentualInput(val);
    };

    const handleConfirmar = async () => {
        if (percentualSafe <= 0 || maxDisponivel <= 0) {
            toast.error('Não há cotas disponíveis neste lote.');
            return;
        }
        setIsSaving(true);
        try {
            // Salva a cota no banco
            const cota = await LoteCota.create({
                lote_id: lote.id,
                lote_titulo: lote.title,
                investidor_id: currentUser.id,
                investidor_nome: currentUser.full_name,
                modelo: 'B',
                percentual_cota: percentualSafe,
                valor_autorizado: valorMinhaCota,
                taxa_operacao: taxaPct,
                total_deposito: valorMinhaCota,
                status: 'reservado',
            });
            setCotaSalva(cota);

            // Registra no SystemLog
            try {
                await SystemLog.create({
                    tipo: 'nova_reserva',
                    mensagem: `Investidor ${currentUser.full_name} reservou ${percentualSafe}% do lote "${lote.title}" — Modelo B`,
                    valor: valorMinhaCota,
                    user_id: currentUser.id,
                    auction_id: lote.id,
                });
            } catch (_) { /* não crítico */ }

            setStep('confirmado');
        } catch (err) {
            console.error('[ModeloBModal] Erro ao salvar cota:', err);
            toast.error('Erro ao registrar sua reserva. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleIrDepositar = () => {
        onClose();
        navigate(createPageUrl('AuctionCheckoutModern'), {
            state: {
                amount: valorFaltante,
                depositType: 'investor_capital',
                auctionId: lote.id,
                auctionTitle: lote.title,
                autoSubmitPix: true,
                returnTo: window.location.pathname + window.location.search,
            },
        });
    };

    const handleIrCentral = () => {
        onClose();
        navigate(createPageUrl('CarteiraInvestidor'));
    };

    const copiarId = () => {
        if (cotaSalva?.id) {
            navigator.clipboard.writeText(cotaSalva.id).then(() => toast.success('ID da reserva copiado!'));
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#161b22] border border-violet-500/30 rounded-2xl w-full max-w-md shadow-2xl shadow-violet-500/10 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-[#30363d] flex items-center justify-between bg-violet-900/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                            <Users size={18} className="text-violet-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-base">Modelo B — Divisão de Capital</h3>
                            <p className="text-[10px] text-slate-500 max-w-[260px] truncate">{lote.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-4">

                    {/* STEP: escolher cota */}
                    {step === 'escolher' && (
                        <>
                            {/* Cotas disponíveis */}
                            <div className="bg-[#0d1117] rounded-xl p-4 border border-[#30363d] space-y-3">
                                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Cotas Disponíveis</p>
                                <CotasProgressBar loteId={lote.id} onCotasLoaded={handleCotasLoaded} />
                            </div>

                            {/* Slider de percentual */}
                            <div className="bg-[#0d1117] rounded-xl p-4 border border-violet-500/20 space-y-3">
                                <p className="text-xs text-violet-400 uppercase tracking-wider font-bold">Defina sua cota</p>

                                {maxDisponivel > 0 ? (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="range"
                                                min={1}
                                                max={maxDisponivel}
                                                step={1}
                                                value={percentualSafe}
                                                onChange={handleSliderChange}
                                                className="flex-1 accent-violet-500 cursor-pointer"
                                            />
                                            <div className="flex items-center gap-1 bg-[#161b22] border border-violet-500/30 rounded-lg px-2 py-1">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={maxDisponivel}
                                                    step={1}
                                                    value={percentualSafe}
                                                    onChange={handleInputChange}
                                                    className="w-10 bg-transparent text-white text-sm font-bold text-center focus:outline-none"
                                                />
                                                <span className="text-violet-400 text-sm font-bold">%</span>
                                            </div>
                                        </div>

                                        {/* Indicador calculado */}
                                        <div className="flex items-center justify-between bg-violet-900/20 border border-violet-500/20 rounded-lg px-4 py-2.5">
                                            <span className="text-sm text-slate-300">Você entra com <span className="text-violet-300 font-bold">{percentualSafe}%</span></span>
                                            <span className="text-lg font-black text-white">{formatCurrency(valorMinhaCota)}</span>
                                        </div>

                                        {/* Saldo */}
                                        <div className={`rounded-lg px-4 py-2.5 border flex items-center justify-between ${saldoSuficiente ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-amber-900/20 border-amber-500/30'}`}>
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Seu Saldo</p>
                                                <p className={`text-sm font-black ${saldoSuficiente ? 'text-emerald-400' : 'text-amber-400'}`}>{formatCurrency(saldoDisponivel)}</p>
                                            </div>
                                            {saldoSuficiente ? (
                                                <div className="text-right">
                                                    <CheckCircle2 size={18} className="text-emerald-400" />
                                                </div>
                                            ) : (
                                                <div className="text-right">
                                                    <p className="text-[10px] text-amber-400 font-bold">Falta</p>
                                                    <p className="text-sm font-black text-amber-400">{formatCurrency(valorFaltante)}</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm text-red-400">Este lote não tem cotas disponíveis.</p>
                                )}
                            </div>

                            {/* Botão confirmar */}
                            <button
                                onClick={handleConfirmar}
                                disabled={isSaving || maxDisponivel <= 0}
                                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <><Loader2 size={16} className="animate-spin" /> Registrando reserva...</>
                                ) : (
                                    <><CheckCircle2 size={16} /> Confirmar Reserva de {percentualSafe}%</>
                                )}
                            </button>
                            <p className="text-[10px] text-slate-500 text-center">
                                Você terá 24h para realizar o depósito após confirmar.
                            </p>
                        </>
                    )}

                    {/* STEP: confirmado */}
                    {step === 'confirmado' && cotaSalva && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            {/* Sucesso */}
                            <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-5 flex items-start gap-4">
                                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="text-emerald-400" size={22} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-emerald-400 text-base">Reserva Registrada!</h4>
                                    <p className="text-emerald-200/70 text-xs mt-1">
                                        Sua cota de <strong>{percentualSafe}%</strong> do lote foi reservada com sucesso.
                                    </p>
                                </div>
                            </div>

                            {/* ID da reserva */}
                            <div className="bg-[#0d1117] rounded-xl p-4 border border-[#30363d] space-y-1">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Nº da Reserva</p>
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs text-slate-300 font-mono break-all">{cotaSalva.id}</p>
                                    <button onClick={copiarId} className="text-slate-500 hover:text-emerald-400 transition-colors shrink-0">
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Resumo */}
                            <div className="bg-[#0d1117] rounded-xl p-4 border border-[#30363d] space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Cota reservada</span>
                                    <span className="text-violet-400 font-bold">{percentualSafe}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Valor da sua cota</span>
                                    <span className="text-white font-bold">{formatCurrency(valorMinhaCota)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Prazo para depositar</span>
                                    <span className="text-amber-400 font-bold">24 horas</span>
                                </div>
                            </div>

                            {/* CTA */}
                            <div className="space-y-2">
                                {!saldoSuficiente && (
                                    <button
                                        onClick={handleIrDepositar}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        <DollarSign size={16} /> Gerar PIX de {formatCurrency(valorFaltante)}
                                    </button>
                                )}
                                <button
                                    onClick={handleIrCentral}
                                    className="w-full bg-[#0d1117] border border-violet-500/30 hover:border-violet-500 text-violet-300 hover:text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <ArrowRight size={16} /> Ir para Central de Capital
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
