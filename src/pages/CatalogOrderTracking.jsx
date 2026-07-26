import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import AvaliarLojistaModal from '@/components/loja/AvaliarLojistaModal';
import { Stars } from '@/components/loja/StarRating';
import {
  Package, Truck, CheckCircle, Clock, ArrowLeft, Copy, MessageCircle,
  ShoppingBag, CreditCard, MapPin, Star, Loader2, XCircle, ReceiptText,
} from 'lucide-react';

const SUPORTE_PHONE = '5521984072064';

// 🧭 Acompanhar Pedido — repaginado 25/07 (pedido Gabriel: "acompanhar o pedido
// corretamente, perfeitamente"). Timeline real com datas, dados completos do pedido,
// pagamento e entrega, ações da plataforma (confirmar recebimento, avaliar com foto,
// suporte) e atualização automática do status — tudo em liquid glass verde, sem
// nenhum diálogo do navegador.

const PAYMENT_LABELS = {
  saldo: '💰 Saldo da Carteira',
  pix: '⚡ PIX',
  card: '💳 Cartão',
  credit_card: '💳 Cartão de Crédito',
  dinheiro: '💵 Dinheiro',
  boleto: '🧾 Boleto',
};

const PAID_STATUSES = ['paid', 'processing', 'preparando', 'shipped', 'saiu_entrega', 'delivered', 'entregue'];
const SHIPPED_STATUSES = ['shipped', 'saiu_entrega', 'delivered', 'entregue'];
const DELIVERED_STATUSES = ['delivered', 'entregue'];
const CANCELED_STATUSES = ['canceled', 'cancelado'];
const FINAL_STATUSES = [...DELIVERED_STATUSES, ...CANCELED_STATUSES];
const CONFIRMABLE = ['paid', 'preparando', 'saiu_entrega', 'shipped', 'entregue', 'delivered'];

const fmtDateTime = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

const GLASS = 'rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl shadow-lg shadow-black/30';

export default function CatalogOrderTracking() {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showConfirmReceipt, setShowConfirmReceipt] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [receiptConfirmed, setReceiptConfirmed] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [myRating, setMyRating] = useState(null);
  const pollRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const saleId = new URLSearchParams(location.search).get('sale_id');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      if (saved) setCurrentUser(JSON.parse(saved));
    } catch (_) { /* visitante */ }
  }, []);

  const loadOrder = useCallback(async (silent = false) => {
    if (!saleId) { setIsLoading(false); return; }
    try {
      if (!silent) setIsLoading(true);
      const result = await base44.functions.invoke('getCatalogOrderById', { sale_id: saleId });
      const data = result?.data || result;
      if (data?.found && data?.order) setOrder(data.order);
    } catch (error) {
      console.error('❌ Erro ao carregar pedido:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [saleId]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  // 🔄 Status ao vivo: enquanto o pedido não chega num estado final, re-consulta a cada 15s
  useEffect(() => {
    if (!order || FINAL_STATUSES.includes(order.status)) return undefined;
    pollRef.current = setInterval(() => loadOrder(true), 15000);
    return () => clearInterval(pollRef.current);
  }, [order?.status, loadOrder]);

  // avaliação já feita neste pedido (pra mostrar "Você avaliou")
  useEffect(() => {
    (async () => {
      try {
        if (!saleId || !currentUser?.id) return;
        const { supabase } = await import('@/api/supabaseClient');
        const { data } = await supabase.from('seller_ratings').select('stars,comment').eq('sale_id', saleId).eq('buyer_id', currentUser.id).maybeSingle();
        if (data) setMyRating(data);
      } catch (_) { /* sem avaliação */ }
    })();
  }, [saleId, currentUser?.id]);

  const copyTracking = async () => {
    try {
      await navigator.clipboard.writeText(order.tracking_code);
      toast({ title: '✅ Código copiado!', description: order.tracking_code, duration: 2000 });
    } catch (_) {
      toast({ title: 'Não foi possível copiar', description: 'Selecione e copie manualmente.', variant: 'destructive' });
    }
  };

  const doConfirmReceipt = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      const uid = currentUser?.id;
      const r = await base44.functions.invoke('confirmarRecebimento', { user_id: uid, sale_id: order.id });
      if (r?.success) {
        setReceiptConfirmed(true);
        toast({ title: '✅ Recebimento confirmado!', description: 'Pagamento liberado pro vendedor. Obrigado!' });
        loadOrder(true);
      } else {
        toast({ title: 'Não foi possível confirmar agora', description: r?.error || 'Tente novamente.', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Erro ao confirmar recebimento', variant: 'destructive' });
    } finally {
      setConfirming(false);
      setShowConfirmReceipt(false);
    }
  };

  const openSupport = () => {
    const msg = encodeURIComponent(`Olá! Preciso de ajuda com meu pedido ${order?.tracking_code || order?.id} — ${order?.product_title || ''}`);
    window.open(`https://wa.me/${SUPORTE_PHONE}?text=${msg}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-green-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Carregando pedido…</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
        <div className={`${GLASS} max-w-md w-full p-8 text-center`}>
          <Package className="w-14 h-14 mx-auto text-gray-600 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Pedido não encontrado</h2>
          <p className="text-gray-400 text-sm mb-6">Verifique o link ou veja todos os seus pedidos.</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate(-1)} variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
            <Button onClick={() => navigate('/MyCatalogOrders')} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 font-bold">
              Meus Pedidos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const status = order.status || 'pending_payment';
  const isCanceled = CANCELED_STATUSES.includes(status);
  const isPaid = PAID_STATUSES.includes(status);
  const isShipped = SHIPPED_STATUSES.includes(status);
  const isDelivered = DELIVERED_STATUSES.includes(status);

  const steps = [
    { key: 'created', label: 'Pedido realizado', icon: ReceiptText, done: true, date: fmtDateTime(order.created_date || order.created_at) },
    { key: 'paid', label: 'Pagamento confirmado', icon: CheckCircle, done: isPaid, date: null, hint: !isPaid ? 'Aguardando pagamento' : null },
    { key: 'shipped', label: 'Saiu para entrega', icon: Truck, done: isShipped, date: fmtDateTime(order.shipped_at), hint: isPaid && !isShipped ? 'Em preparação pelo vendedor' : null },
    { key: 'delivered', label: 'Entregue', icon: Package, done: isDelivered, date: fmtDateTime(order.delivered_at) },
  ];
  const currentStepIdx = isDelivered ? 3 : isShipped ? 2 : isPaid ? 1 : 0;

  const headline = isCanceled
    ? { title: 'Pedido cancelado', desc: 'Este pedido foi cancelado.', color: 'from-red-500 to-red-600', Icon: XCircle }
    : isDelivered
      ? { title: 'Entregue! 🎉', desc: 'Pedido entregue com sucesso.', color: 'from-emerald-500 to-green-600', Icon: Package }
      : isShipped
        ? { title: 'A caminho! 🚚', desc: `Seu pedido saiu para entrega${order.carrier ? ` via ${order.carrier}` : ''}.`, color: 'from-indigo-500 to-blue-600', Icon: Truck }
        : isPaid
          ? { title: 'Pagamento confirmado', desc: 'Seu pedido está sendo preparado para envio.', color: 'from-green-500 to-emerald-600', Icon: CheckCircle }
          : { title: 'Aguardando pagamento', desc: 'Realize o pagamento para prosseguir com o envio.', color: 'from-yellow-500 to-amber-600', Icon: Clock };

  const total = Number(order.total_amount || order.sale_price || 0);
  const discount = Number(order.discount_amount || 0);
  const qty = Number(order.quantity) || 1;
  const paymentLabel = PAYMENT_LABELS[String(order.payment_method || '').toLowerCase()] || (order.payment_method || '—');
  const canConfirm = !isCanceled && CONFIRMABLE.includes(status) && currentUser?.id && !receiptConfirmed;
  const canRate = !isCanceled && isPaid && order.seller_id && currentUser?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">Acompanhar Pedido</h1>
            <p className="text-[11px] text-gray-500 font-mono">#{order.id}</p>
          </div>
        </div>

        {/* Status hero + timeline */}
        <div className={`${GLASS} overflow-hidden`}>
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${headline.color} grid place-items-center shadow-lg shrink-0`}>
                <headline.Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-black text-white">{headline.title}</h2>
                <p className="text-gray-400 text-sm">{headline.desc}</p>
                {!FINAL_STATUSES.includes(status) && (
                  <p className="text-[11px] text-emerald-400/80 mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Atualiza sozinho a cada 15s
                  </p>
                )}
              </div>
            </div>

            {/* Timeline vertical com datas */}
            {!isCanceled && (
              <div className="relative pl-1">
                {steps.map((step, i) => {
                  const active = i === currentStepIdx && !isDelivered;
                  return (
                    <div key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
                      {i < steps.length - 1 && (
                        <span className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${steps[i + 1].done ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      )}
                      <span className={`relative z-10 grid place-items-center w-8 h-8 rounded-full border shrink-0 ${
                        step.done
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : active
                            ? 'bg-yellow-500/15 border-yellow-400/40 text-yellow-300 animate-pulse'
                            : 'bg-white/5 border-white/10 text-gray-600'
                      }`}>
                        <step.icon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 pt-1">
                        <p className={`text-sm font-bold leading-tight ${step.done ? 'text-white' : active ? 'text-yellow-200' : 'text-gray-500'}`}>
                          {step.label}
                        </p>
                        {(step.date || step.hint) && (
                          <p className="text-xs text-gray-500">{step.date || step.hint}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rastreio */}
            {order.tracking_code && (
              <div className="mt-5 pt-5 border-t border-white/10">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Código de rastreio{order.carrier ? ` · ${order.carrier}` : ''}</p>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
                  <code className="font-mono text-base sm:text-lg font-bold text-emerald-300 truncate">{order.tracking_code}</code>
                  <Button size="sm" onClick={copyTracking} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 font-bold shrink-0">
                    <Copy className="w-4 h-4 mr-1.5" /> Copiar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Produto + resumo */}
        <div className={`${GLASS} p-5`}>
          <h3 className="text-white font-black flex items-center gap-2 mb-4"><ShoppingBag className="w-5 h-5 text-emerald-400" /> Detalhes do Pedido</h3>
          <div className="flex gap-4">
            {order.product_image && (
              <img src={order.product_image} alt={order.product_title} className="w-24 h-24 object-cover rounded-xl border border-white/10 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-white leading-snug mb-1">{order.product_title}</h4>
              <p className="text-xs text-gray-500 mb-2">Quantidade: {qty}</p>
              <div className="space-y-1 text-sm">
                {discount > 0 && (
                  <p className="text-gray-400 flex justify-between"><span>Desconto{order.coupon_code ? ` (${order.coupon_code})` : ''}:</span> <span className="text-yellow-400">− R$ {discount.toFixed(2)}</span></p>
                )}
                <p className="flex justify-between items-center">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-2xl font-black text-green-400">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10">
            <div className="flex items-start gap-2.5">
              <CreditCard className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Pagamento</p>
                <p className="text-sm text-gray-200 font-medium">{paymentLabel}</p>
              </div>
            </div>
            {order.buyer_address && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Entrega para {order.buyer_name || 'você'}</p>
                  <p className="text-sm text-gray-200 leading-snug">{order.buyer_address}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ações da plataforma */}
        {!isCanceled && (
          <div className={`${GLASS} p-5 space-y-2.5`}>
            {canConfirm && (
              <button
                onClick={() => setShowConfirmReceipt(true)}
                className="w-full py-3 rounded-xl font-black text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/25 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" /> Confirmar recebimento
              </button>
            )}
            {receiptConfirmed && (
              <div className="w-full py-3 rounded-xl border border-green-500/30 bg-green-500/10 text-green-300 font-bold text-sm flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Recebimento confirmado — obrigado!
              </div>
            )}
            {canRate && (
              myRating ? (
                <button
                  onClick={() => setShowRating(true)}
                  className="w-full py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Stars value={myRating.stars} size={16} />
                  <span className="text-yellow-300 text-sm font-semibold">Você avaliou · editar</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowRating(true)}
                  className="w-full py-3 rounded-xl border border-yellow-500/40 bg-gradient-to-r from-yellow-500/15 to-amber-500/10 hover:from-yellow-500/25 text-yellow-300 font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Star className="w-4 h-4" fill="#facc15" /> Avaliar vendedor (pode enviar foto!)
                </button>
              )
            )}
            <button
              onClick={openSupport}
              className="w-full py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-gray-200 font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-green-400" /> Falar com o suporte no WhatsApp
            </button>
          </div>
        )}
      </div>

      {/* Confirmação da plataforma */}
      <ConfirmModal
        open={showConfirmReceipt}
        title="Confirmar recebimento?"
        message={<>Você confirma que recebeu <b className="text-white">{order.product_title}</b>?<br />Isso libera o pagamento pro vendedor.</>}
        confirmLabel="✅ Sim, recebi"
        loading={confirming}
        onConfirm={doConfirmReceipt}
        onClose={() => setShowConfirmReceipt(false)}
      />

      {showRating && (
        <AvaliarLojistaModal
          order={{ ...order, minha_avaliacao: myRating }}
          buyer={currentUser}
          onClose={() => setShowRating(false)}
          onDone={({ stars, comment }) => {
            setMyRating({ stars, comment });
            setShowRating(false);
            toast({ title: '⭐ Avaliação enviada!', description: 'Obrigado pelo feedback.' });
          }}
        />
      )}
    </div>
  );
}
