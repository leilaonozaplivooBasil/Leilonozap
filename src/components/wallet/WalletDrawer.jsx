import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Wallet,
  X,
  Plus,
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
} from 'lucide-react';
import { toast } from 'sonner';

const QUICK_AMOUNTS = [20, 50, 100, 200];

const TX_STYLE = {
  deposit: { icon: ArrowDownCircle, color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' },
  purchase: { icon: ArrowUpCircle, color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' },
  commission: { icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
  withdrawal: { icon: Banknote, color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' },
};

function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

export default function WalletDrawer({ open, onClose, currentUser, onBalanceUpdated }) {
  const [view, setView] = useState('wallet'); // 'wallet' | 'recharge' | 'pix' | 'success'
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pixData, setPixData] = useState(null);
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
      setView('wallet');
      setPixData(null);
      loadWallet();
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [open, loadWallet]);

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
    if (effectiveAmount < 5) { toast.error('Valor mínimo: R$ 5,00'); return; }
    setGenerating(true);
    try {
      const result = await base44.functions.invoke('createAsaasPayment', {
        amount: effectiveAmount,
        billing_type: 'PIX',
        deposit_type: 'digital_wallet',
        buyer_id: currentUser.id,
        buyer_name: currentUser.full_name || 'Cliente',
        buyer_email: currentUser.email,
        buyer_cpf: currentUser.cpf || '',
        description: 'Depósito na Carteira Digital — Leilão NoZap',
      });
      const data = result?.data || result;
      if (data?.success && data?.pix_payload) {
        setPixData(data);
        setView('pix');
      } else {
        toast.error(data?.error || 'Não foi possível gerar o PIX. Tente novamente.');
      }
    } catch (e) {
      toast.error('Erro ao gerar PIX: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const balance = wallet?.saldo_disponivel ?? 0;
  const hasCommission = (wallet?.commission_balance || 0) > 0;
  const hasAllocated = (wallet?.saldo_alocado || 0) > 0;

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
          {/* Painel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 z-[95] h-full w-full sm:w-[420px] flex flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-l border-white/10 shadow-2xl"
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
                  {/* Card de saldo */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-600 to-emerald-800 p-5 shadow-lg shadow-green-900/40">
                    <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
                    <div className="absolute -right-2 bottom-2 w-16 h-16 rounded-full bg-white/5" />
                    <div className="flex items-center justify-between">
                      <p className="text-green-100 text-sm font-medium">Saldo disponível</p>
                      <button onClick={loadWallet} className="p-1.5 rounded-lg hover:bg-white/15 text-green-100" title="Atualizar">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    <p className="text-4xl font-extrabold text-white mt-1 tracking-tight">
                      R$ {balance.toFixed(2).replace('.', ',')}
                    </p>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {hasAllocated && (
                        <span className="text-xs font-semibold bg-black/25 text-green-100 rounded-full px-2.5 py-1">
                          Alocado em lances: R$ {(wallet.saldo_alocado).toFixed(2).replace('.', ',')}
                        </span>
                      )}
                      {hasCommission && (
                        <span className="text-xs font-semibold bg-black/25 text-amber-200 rounded-full px-2.5 py-1">
                          Comissões: R$ {(wallet.commission_balance).toFixed(2).replace('.', ',')}
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={() => { setRechargeAmount(null); setCustomAmount(''); setView('recharge'); }}
                      className="w-full mt-4 h-11 bg-white text-emerald-700 hover:bg-green-50 font-bold shadow"
                    >
                      <Plus className="w-5 h-5 mr-1" />
                      Adicionar Saldo
                    </Button>
                  </div>

                  {/* Extrato */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3">Extrato</h3>
                    {loading && transactions.length === 0 ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-green-400" /></div>
                    ) : transactions.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-8">Nenhuma movimentação ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {transactions.slice(0, 50).map((tx) => {
                          const style = TX_STYLE[tx.type] || TX_STYLE.purchase;
                          const Icon = style.icon;
                          return (
                            <div key={tx.id} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
                              <div className={`flex-shrink-0 p-2 rounded-lg border ${style.bg}`}>
                                <Icon className={`w-4 h-4 ${style.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{tx.title}</p>
                                <p className="text-xs text-gray-400">
                                  {tx.source} · {formatDate(tx.date)}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className={`text-sm font-bold ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {tx.amount >= 0 ? '+' : '−'} R$ {Math.abs(tx.amount).toFixed(2).replace('.', ',')}
                                </p>
                                {tx.status === 'pending' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                                    <Clock className="w-3 h-3" /> pendente
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
                    disabled={generating || effectiveAmount < 5}
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white font-bold"
                  >
                    {generating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <QrCode className="w-5 h-5 mr-2" />}
                    {generating ? 'Gerando PIX...' : `Gerar PIX${effectiveAmount >= 5 ? ` de R$ ${effectiveAmount.toFixed(2).replace('.', ',')}` : ''}`}
                  </Button>
                  <p className="text-xs text-gray-500 text-center">Valor mínimo R$ 5,00 · Pagamento seguro</p>
                </div>
              )}

              {view === 'pix' && pixData && (
                <div className="p-5 space-y-4 text-center">
                  <p className="text-gray-300 text-sm">
                    Escaneie o QR Code ou copie o código para pagar <span className="text-green-400 font-bold">R$ {(pixData.amount || effectiveAmount).toFixed(2).replace('.', ',')}</span>
                  </p>
                  {pixData.pix_qr_code && (
                    <div className="bg-white rounded-xl p-4 inline-block">
                      <img src={pixData.pix_qr_code} alt="QR Code PIX" className="w-52 h-52" />
                    </div>
                  )}
                  <Button
                    onClick={() => { navigator.clipboard.writeText(pixData.pix_payload); toast.success('Código PIX copiado!'); }}
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Código PIX
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
