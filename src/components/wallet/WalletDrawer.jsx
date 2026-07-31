import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fmtBR } from '@/lib/money';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Wallet,
  X,
  Plus,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Award,
  Banknote,
  Copy,
  QrCode,
  RefreshCw,
  Check,
  Loader2,
  ArrowLeft,
  Clock,
  Gavel,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCopiarPix } from '@/hooks/useCopiarPix';
import BidStateTag from '@/components/wallet/BidStateTag';

const QUICK_AMOUNTS = [100, 200, 500, 1000];

const TX_STYLE = {
  deposit: { icon: ArrowDownCircle, grad: 'bg-gradient-to-br from-emerald-400 to-green-600', glow: 'shadow-[0_2px_10px_rgba(16,185,129,0.5)]' },
  purchase: { icon: ArrowUpCircle, grad: 'bg-gradient-to-br from-red-400 to-rose-600', glow: 'shadow-[0_2px_10px_rgba(239,68,68,0.5)]' },
  sale: { icon: TrendingUp, grad: 'bg-gradient-to-br from-emerald-300 to-teal-600', glow: 'shadow-[0_2px_10px_rgba(16,185,129,0.5)]' },
  commission: { icon: Award, grad: 'bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600', glow: 'shadow-[0_2px_10px_rgba(245,158,11,0.55)]' },
  withdrawal: { icon: Banknote, grad: 'bg-gradient-to-br from-blue-400 to-indigo-600', glow: 'shadow-[0_2px_10px_rgba(59,130,246,0.5)]' },
  bid: { icon: Gavel, grad: 'bg-gradient-to-br from-slate-400 to-slate-600', glow: 'shadow-[0_2px_10px_rgba(100,116,139,0.4)]' },
};

function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

export default function WalletDrawer({ open, onClose, currentUser, onBalanceUpdated, startView = 'wallet' }) {
  const { copiado: pixCopiado, copiar: copiarPix } = useCopiarPix();
  const [view, setView] = useState('wallet'); // 'wallet' | 'recharge' | 'pix' | 'success'
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [visibleCount, setVisibleCount] = useState(15);
  const [filterTab, setFilterTab] = useState('all');
  const pollRef = useRef(null);

  const loadWallet = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [walletRes, historyRes] = await Promise.all([
        base44.functions.invoke('getMyWallet', { user_id: currentUser.id }),
        base44.functions.invoke('getDigitalWalletHistory', { user_id: currentUser.id }),
      ]);
      const w = walletRes?.data || walletRes;
      const h = historyRes?.data || historyRes;
      if (w?.success) setWallet(w);
      setTransactions(Array.isArray(h?.transactions) ? h.transactions : []);
    } catch (e) {
      console.warn('Erro ao carregar carteira:', e.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (open) {
      // startView='recharge' abre direto na tela de recarga (usado pelo aviso de
      // saldo insuficiente na sala do leilão — um clique só até o PIX).
      setView(startView);
      setRechargeAmount(null);
      setCustomAmount('');
      setPixData(null);
      setVisibleCount(15);
      setFilterTab('all');
      loadWallet();
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [open, loadWallet, startView]);

  // Polling de confirmação do PIX gerado dentro da carteira
  useEffect(() => {
    if (view !== 'pix' || !pixData?.payment_id) return;
    const check = async () => {
      try {
        const result = await base44.functions.invoke('checkPaymentStatus', { payment_id: pixData.payment_id });
        const data = result?.data || result;
        if (data?.found && data?.status === 'confirmed') {
          clearInterval(pollRef.current);
          setView('success');
          toast.success('✅ Pagamento confirmado! Saldo adicionado.');
          await loadWallet();
          if (onBalanceUpdated) onBalanceUpdated();
        }
      } catch { /* silencioso */ }
    };
    pollRef.current = setInterval(check, 4000);
    return () => clearInterval(pollRef.current);
  }, [view, pixData, loadWallet, onBalanceUpdated]);

  // Depois do sucesso, volta sozinho para a carteira — o usuário continua onde estava
  useEffect(() => {
    if (view !== 'success') return;
    const t = setTimeout(() => { setView('wallet'); setPixData(null); }, 2500);
    return () => clearTimeout(t);
  }, [view]);

  const effectiveAmount = rechargeAmount || (parseFloat(customAmount.replace(',', '.')) || 0);

  const handleGeneratePix = async () => {
    if (effectiveAmount < 100) { toast.error('Valor mínimo: R$ 100,00'); return; }
    setGenerating(true);
    try {
      // 🔒 createAsaasPayment é a função real publicada na Vercel (gera PIX via Mercado
      // Pago). "createMercadoPagoDeposit" só existe do lado Base44 e quebrava com
      // not_implemented no site publicado — mesmo ajuste já feito no checkout do leilão.
      const result = await base44.functions.invoke('createAsaasPayment', {
        auction_id: null,
        buyer_id: currentUser.id,
        buyer_name: currentUser.full_name || 'Cliente',
        buyer_email: currentUser.email,
        buyer_cpf: currentUser.cpf || '',
        buyer_phone: currentUser.phone || '',
        amount: effectiveAmount,
        billing_type: 'PIX',
        description: `Depósito na Carteira Digital - R$ ${fmtBR(effectiveAmount)}`,
        deposit_type: 'digital_wallet',
      });
      const data = result?.data || result;
      if (data?.success && data?.pix_payload) {
        setPixData(data);
        setView('pix');
      } else if (data?.error === 'not_implemented' || data?.error === 'network_or_not_implemented') {
        // Ambiente de preview do Base44 não tem as rotas /api (elas só existem no site publicado).
        toast.error('Geração de PIX disponível somente no site publicado (leilaonozap.net).');
      } else {
        toast.error(data?.error || 'Não foi possível gerar o PIX. Tente novamente.');
      }
    } catch (e) {
      toast.error('Erro ao gerar PIX: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const FILTER_TABS = [
    { key: 'all', label: 'Todos' },
    { key: 'deposit', label: 'Depósitos' },
    { key: 'purchase', label: 'Compras' },
    { key: 'bid', label: 'Lances' },
  ];
  const filteredTransactions = React.useMemo(
    () => (filterTab === 'all' ? transactions : transactions.filter((t) => t.type === filterTab)),
    [transactions, filterTab]
  );

  const balance = wallet?.saldo_disponivel ?? 0;
  const hasCommission = (wallet?.commission_balance || 0) > 0;
  const hasAllocated = (wallet?.saldo_alocado || 0) > 0;

  // Resumo financeiro calculado do extrato
  const totals = React.useMemo(() => {
    let deposited = 0, spent = 0, sold = 0, pendingCount = 0;
    for (const t of transactions) {
      if (t.status === 'pending') { pendingCount++; continue; }
      if (t.status === 'cancelled') { continue; }
      if (t.type === 'deposit') deposited += t.amount;
      else if (t.type === 'purchase') spent += Math.abs(t.amount);
      else if (t.type === 'sale') sold += t.amount;
    }
    return { deposited, spent, sold, pendingCount };
  }, [transactions]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
          />
          {/* Painel central — modal liquid glass no meio da tela (desktop e mobile) */}
          <div className="fixed inset-0 z-[95] grid place-items-center p-3 sm:p-6 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            className="wallet-modal pointer-events-auto w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                {(view === 'recharge' || view === 'pix') && (
                  <button
                    onClick={() => { setView(view === 'pix' ? 'recharge' : 'wallet'); }}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <Wallet className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-bold text-white">
                  {view === 'recharge' ? 'Adicionar Saldo' : view === 'pix' ? 'Pague com PIX' : 'Minha Carteira'}
                </h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {view === 'wallet' && (
                <div className="p-5 space-y-5">
                  {/* Cartão Leilão NoZap — estilo cartão de crédito com nome do usuário */}
                  <div className="nz-card relative w-full aspect-[1.62/1] rounded-2xl overflow-hidden select-none">
                    <div className="nz-card-sheen" />
                    <img
                      src="/martelo-3d.png"
                      alt=""
                      className="absolute -right-5 -bottom-6 w-32 h-32 object-contain opacity-[0.14] rotate-[-18deg] pointer-events-none"
                    />
                    <div className="relative h-full flex flex-col justify-between p-4 sm:p-5">
                      <div className="flex items-start justify-between">
                        <img src="/brand/logo-horizontal-dark.webp" alt="Leilão NoZap" className="h-7 object-contain" />
                        <button onClick={loadWallet} className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-100/70 hover:text-white" title="Atualizar">
                          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-200/70 mb-0.5">Saldo disponível</p>
                          <p className="text-[1.9rem] sm:text-[2.1rem] leading-none font-extrabold text-white tracking-tight tabular-nums drop-shadow">
                            R$ {fmtBR(balance)}
                          </p>
                        </div>
                        <div className="nz-chip" />
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-emerald-200/60">Titular</p>
                          <p className="text-xs sm:text-sm font-bold text-white uppercase tracking-[0.12em]">
                            {(currentUser?.full_name || 'Cliente NoZap').slice(0, 26)}
                          </p>
                        </div>
                        <p className="text-xs font-bold text-emerald-100/80 tracking-[0.25em] tabular-nums">
                          •••• {String(currentUser?.id || '0000').slice(-4).toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Resumo financeiro (vendedor/admin ganham a coluna Vendido) */}
                  <div className={`grid gap-2 ${totals.sold > 0 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {[
                      { label: 'Depositado', value: totals.deposited, color: 'text-emerald-300' },
                      { label: 'Compras', value: totals.spent, color: 'text-red-300' },
                      ...(totals.sold > 0 ? [{ label: 'Vendido', value: totals.sold, color: 'text-emerald-300' }] : []),
                      { label: 'Comissões', value: (wallet?.commission_balance || 0), color: 'text-amber-300' },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.045] px-2.5 py-2.5 text-center">
                        <p className="text-[8.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 mb-0.5">{s.label}</p>
                        <p className={`text-[13px] font-bold tabular-nums ${s.color}`}>
                          R$ {fmtBR(s.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                  {(hasAllocated || totals.pendingCount > 0) && (
                    <div className="flex gap-4 flex-wrap -mt-1 px-1">
                      {hasAllocated && (
                        <p className="text-[11px] text-gray-400">
                          Alocado em lances: <span className="font-bold text-gray-200 tabular-nums">R$ {fmtBR((wallet.saldo_alocado))}</span>
                        </p>
                      )}
                      {totals.pendingCount > 0 && (
                        <p className="text-[11px] text-amber-400/90">{totals.pendingCount} pagamento{totals.pendingCount > 1 ? 's' : ''} aguardando confirmação</p>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={() => { setRechargeAmount(null); setCustomAmount(''); setView('recharge'); }}
                    className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Adicionar Saldo
                  </Button>

                  {/* Extrato */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3">Extrato</h3>
                    <div className="flex gap-1.5 mb-3 overflow-x-auto -mx-0.5 px-0.5">
                      {FILTER_TABS.map((f) => (
                        <button
                          key={f.key}
                          onClick={() => { setFilterTab(f.key); setVisibleCount(15); }}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filterTab === f.key
                            ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200'}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    {loading && transactions.length === 0 ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-green-400" /></div>
                    ) : filteredTransactions.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-8">Nenhuma movimentação ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredTransactions.slice(0, visibleCount).map((tx) => {
                          const style = TX_STYLE[tx.type] || TX_STYLE.purchase;
                          const Icon = style.icon;
                          return (
                            <div key={tx.id} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
                              <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ring-1 ring-white/25 ${style.grad} ${style.glow}`}>
                                <Icon className="w-4 h-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{tx.title}</p>
                                <p className="text-xs text-gray-400">
                                  {tx.source} · {formatDate(tx.date)}
                                </p>
                                {/* Estado do lance embaixo do produto: no celular o texto
                                    completo cabe aqui sem apertar o valor à direita. */}
                                {tx.type === 'bid' && <BidStateTag state={tx.bid_state} />}
                              </div>
                              <div className="text-right flex-shrink-0">
                                {tx.type === 'bid' ? (
                                  <p className="text-sm font-bold text-gray-300">R$ {fmtBR(Math.abs(tx.amount))}</p>
                                ) : (
                                  <p className={`text-sm font-bold ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {tx.amount >= 0 ? '+' : '−'} R$ {fmtBR(Math.abs(tx.amount))}
                                  </p>
                                )}
                                {tx.status === 'pending' && (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] text-amber-400"
                                    title={tx.type === 'deposit' ? 'O PIX desta cobrança ainda não foi gerado/pago.' : 'O PIX desta compra ainda não foi gerado/pago.'}
                                  >
                                    <Clock className="w-3 h-3" /> aguardando pagamento
                                  </span>
                                )}
                                {tx.status === 'cancelled' && (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] text-gray-500"
                                    title="Este PIX não foi pago e a cobrança foi cancelada."
                                  >
                                    <XCircle className="w-3 h-3" /> cancelado
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {visibleCount < filteredTransactions.length && (
                          <button
                            onClick={() => setVisibleCount((c) => c + 15)}
                            className="w-full text-center text-xs font-semibold text-emerald-300 hover:text-emerald-200 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                          >
                            Ver mais
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {view === 'recharge' && (
                <div className="p-5 space-y-5">
                  <p className="text-gray-300 text-sm">Escolha o valor da recarga. O saldo cai na hora após o pagamento PIX.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {QUICK_AMOUNTS.map((v) => (
                      <button
                        key={v}
                        onClick={() => { setRechargeAmount(v); setCustomAmount(''); }}
                        className={`h-14 rounded-xl border-2 font-bold text-lg transition-all ${rechargeAmount === v
                          ? 'border-green-500 bg-green-500/15 text-green-300'
                          : 'border-gray-700 bg-gray-800/40 text-white hover:border-green-500/50'}`}
                      >
                        R$ {v},00
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Outro valor</label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={customAmount}
                      onChange={(e) => { setCustomAmount(e.target.value.replace(/[^\d.,]/g, '')); setRechargeAmount(null); }}
                      placeholder="R$ 0,00"
                      className="bg-gray-800/50 border-gray-700 text-white h-12 text-lg"
                    />
                  </div>
                  <Button
                    onClick={handleGeneratePix}
                    disabled={generating || effectiveAmount < 100}
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white font-bold"
                  >
                    {generating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <QrCode className="w-5 h-5 mr-2" />}
                    {generating ? 'Gerando PIX...' : `Gerar PIX${effectiveAmount >= 100 ? ` de R$ ${fmtBR(effectiveAmount)}` : ''}`}
                  </Button>
                  <p className="text-xs text-gray-500 text-center">Valor mínimo R$ 100,00 · Pagamento seguro</p>
                </div>
              )}

              {view === 'pix' && pixData && (
                <div className="p-5 space-y-4 text-center">
                  <p className="text-gray-300 text-sm">
                    Escaneie o QR Code ou copie o código para pagar <span className="text-green-400 font-bold">R$ {fmtBR((pixData.amount || effectiveAmount))}</span>
                  </p>
                  {pixData.pix_qr_code && (
                    <div className="bg-white rounded-xl p-4 inline-block">
                      <img src={pixData.pix_qr_code} alt="QR Code PIX" className="w-52 h-52" />
                    </div>
                  )}
                  <Button
                    onClick={() => copiarPix(pixData.pix_payload)}
                    className={`w-full h-12 text-white font-bold transition-colors ${pixCopiado ? 'bg-emerald-500 hover:bg-emerald-500' : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'}`}
                  >
                    {pixCopiado ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {pixCopiado ? 'Código PIX copiado!' : 'Copiar Código PIX'}
                  </Button>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                    Aguardando confirmação do pagamento...
                  </div>
                  <p className="text-xs text-gray-500">A confirmação é automática. Você continua exatamente onde estava.</p>
                </div>
              )}

              {view === 'success' && (
                <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                    className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/60 flex items-center justify-center"
                  >
                    <Check className="w-10 h-10 text-green-400" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-white">Pagamento confirmado!</h3>
                  <p className="text-gray-300 text-sm">Seu saldo foi atualizado. Bons lances!</p>
                </div>
              )}
            </div>
            <style>{`
              .nz-card {
                background:
                  radial-gradient(ellipse at 20% -10%, rgba(74, 222, 128, 0.22), transparent 55%),
                  radial-gradient(ellipse at 105% 110%, rgba(245, 158, 11, 0.10), transparent 45%),
                  linear-gradient(135deg, #0d4d2e 0%, #0a3d24 45%, #052818 100%);
                border: 1px solid rgba(74, 222, 128, 0.35);
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.14);
              }
              .nz-card-sheen {
                position: absolute; inset: 0; pointer-events: none;
                background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.09) 45%, rgba(255, 255, 255, 0.02) 55%, transparent 70%);
              }
              .nz-chip {
                width: 38px; height: 28px; border-radius: 6px;
                background: linear-gradient(135deg, #f5d178, #d9a13c 55%, #b57e22);
                box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.55), inset 0 -1px 2px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.35);
                position: relative;
              }
              .nz-chip::before {
                content: ''; position: absolute; inset: 5px 7px;
                border: 1px solid rgba(90, 60, 10, 0.5); border-radius: 3px;
              }
              .wallet-modal {
                border-radius: 24px;
                border: 1px solid rgba(52, 211, 153, 0.28);
                background: linear-gradient(160deg, rgba(16, 185, 129, 0.14) 0%, rgba(9, 32, 24, 0.92) 40%, rgba(5, 18, 14, 0.96) 100%);
                backdrop-filter: blur(28px) saturate(1.35);
                -webkit-backdrop-filter: blur(28px) saturate(1.35);
                box-shadow: 0 24px 70px rgba(0, 0, 0, 0.6), 0 0 44px rgba(16, 185, 129, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.12);
              }
            `}</style>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}