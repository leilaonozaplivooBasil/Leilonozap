import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fmtBR } from '@/lib/money';
import { useNavigate, useLocation } from 'react-router-dom';
import { plataforma } from '@/api/plataformaClient';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import AvaliarLojistaModal from '@/components/loja/AvaliarLojistaModal';
import { Stars } from '@/components/loja/StarRating';
import {
  Package, Truck, CheckCircle, Clock, ArrowLeft, Copy, MessageCircle,
  ShoppingBag, CreditCard, MapPin, Star, Loader2, XCircle, ReceiptText,
  AlertTriangle, ExternalLink, RefreshCw, Hash, Navigation, Home,
} from 'lucide-react';
import { WHATSAPP_OFICIAL } from '@/lib/whatsappOficial';
import {
  situacaoDaEntrega, linhaDoTempo, codigoReal, linksDeRastreio, numeroInternoDoPedido, mensagemDoSuporte,
} from '@/lib/rastreio';

const SUPORTE_PHONE = WHATSAPP_OFICIAL;

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

// 📦 DIR-187 (30/09/2026) — A ENTREGA NÃO SAI MAIS DO STATUS DE PAGAMENTO.
// `status = 'entregue'` é "venda paga" (herança do Base44). Esta tela lia isso como
// "pedido entregue" e mostrava o número interno LZ… como código de rastreio. O
// cliente Herbert viu "Entregue! 🎉" com o objeto parado nos Correios ("endereço
// inexistente") e mandou o print no grupo. Agora: a situação vem de
// src/lib/rastreio.js (transportadora, Melhor Envio, logística, ou confirmação do
// próprio cliente); o código real, o link dos Correios, a transportadora e as
// movimentações vêm da function rastrearPedido; ocorrência vira aviso com o que fazer.
const PAID_STATUSES = ['paid', 'processing', 'preparando', 'shipped', 'saiu_entrega', 'delivered', 'entregue'];
const CANCELED_STATUSES = ['canceled', 'cancelado'];
const CONFIRMABLE = ['paid', 'preparando', 'saiu_entrega', 'shipped', 'entregue', 'delivered'];
const ETAPAS_FINAIS = ['entregue', 'cancelado'];
const INTERVALO_MS = 60000;

const HERO = {
  cancelado: { color: 'from-red-500 to-red-600', Icon: XCircle },
  entregue: { color: 'from-emerald-500 to-green-600', Icon: Package },
  problema: { color: 'from-orange-500 to-amber-600', Icon: AlertTriangle },
  saiu_entrega: { color: 'from-indigo-500 to-blue-600', Icon: Truck },
  em_transito: { color: 'from-indigo-500 to-blue-600', Icon: Navigation },
  postado: { color: 'from-sky-500 to-blue-600', Icon: Package },
  preparando: { color: 'from-green-500 to-emerald-600', Icon: CheckCircle },
  aguardando_pagamento: { color: 'from-yellow-500 to-amber-600', Icon: Clock },
};
const ICONE_ETAPA = { pedido: ReceiptText, pagamento: CheckCircle, postado: Package, em_transito: Navigation, saiu_entrega: Truck, entregue: Home };

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
  const [rastreio, setRastreio] = useState(null);
  const [consultando, setConsultando] = useState(false);
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
      const result = await plataforma.functions.invoke('getCatalogOrderById', { sale_id: saleId });
      const data = result?.data || result;
      if (data?.found && data?.order) setOrder(data.order);
    } catch (error) {
      console.error('❌ Erro ao carregar pedido:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [saleId]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  // 📦 A transportadora responde: código real, link, movimentações e a situação de verdade
  const consultarRastreio = useCallback(async (forcar = false) => {
    if (!saleId) return;
    setConsultando(true);
    try {
      const r = await plataforma.functions.invoke('rastrearPedido', { sale_id: saleId, forcar });
      const data = r?.data || r;
      if (data?.success) {
        setRastreio(data);
        if (forcar) toast({ title: '✅ Consulta atualizada', description: data.situacao?.titulo || 'Situação verificada na transportadora.', duration: 2500 });
      } else if (forcar) {
        toast({ title: 'Não foi possível consultar agora', description: data?.error || 'Tente novamente em instantes.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('❌ Erro ao rastrear pedido:', error);
      if (forcar) toast({ title: 'Não foi possível consultar agora', description: 'Tente novamente em instantes.', variant: 'destructive' });
    } finally {
      setConsultando(false);
    }
  }, [saleId]);

  useEffect(() => { if (order?.id) consultarRastreio(false); }, [order?.id, consultarRastreio]);

  const etapaAtual = rastreio?.situacao?.etapa;
  // 🔄 Ao vivo: enquanto a ENTREGA não termina, pedido + transportadora a cada minuto
  useEffect(() => {
    if (!order || ETAPAS_FINAIS.includes(etapaAtual)) return undefined;
    pollRef.current = setInterval(() => { loadOrder(true); consultarRastreio(false); }, INTERVALO_MS);
    return () => clearInterval(pollRef.current);
  }, [order?.id, etapaAtual, loadOrder, consultarRastreio]);

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

  const copyTracking = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast({ title: '✅ Código copiado!', description: texto, duration: 2000 });
    } catch (_) {
      toast({ title: 'Não foi possível copiar', description: 'Selecione e copie manualmente.', variant: 'destructive' });
    }
  };

  const doConfirmReceipt = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      const uid = currentUser?.id;
      const r = await plataforma.functions.invoke('confirmarRecebimento', { user_id: uid, sale_id: order.id });
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
    const msg = encodeURIComponent(mensagemDoSuporte({
      numeroPedido: rastreio?.codigo_interno || numeroInternoDoPedido(order?.id),
      codigo: rastreio?.codigo || codigoReal({ tracking_code: order?.tracking_code }),
      produto: order?.product_title || '',
    }));
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
  const isPaid = PAID_STATUSES.includes(status);
  const situacao = receiptConfirmed
    ? situacaoDaEntrega({ ...order, recebimentoConfirmado: true })
    : (rastreio?.situacao || situacaoDaEntrega(order));
  const isCanceled = situacao.etapa === 'cancelado' || CANCELED_STATUSES.includes(status);
  const isDelivered = situacao.etapa === 'entregue';
  const emAndamento = !ETAPAS_FINAIS.includes(situacao.etapa);

  const codigo = rastreio?.codigo || codigoReal({ tracking_code: order.tracking_code });
  const numeroInterno = rastreio?.codigo_interno || numeroInternoDoPedido(order.id);
  const transportadora = rastreio?.transportadora || order.carrier || '';
  const servico = rastreio?.servico || '';
  const links = rastreio?.links || linksDeRastreio({ codigo, transportadora });
  const linkPrincipal = links.correios
    ? { url: links.correios, rotulo: 'Rastrear no site dos Correios' }
    : links.transportadora
      ? { url: links.transportadora, rotulo: `Rastrear no site da ${transportadora || 'transportadora'}` }
      : null;
  const eventos = Array.isArray(rastreio?.eventos) ? rastreio.eventos : [];
  const steps = linhaDoTempo(situacao, {
    criadoEm: order.created_date || order.created_at,
    pago: isPaid,
    postadoEm: rastreio?.melhor_envio?.posted_at || order.shipped_at || null,
    eventos,
  });
  const idxAtual = Math.max(0, steps.findIndex((e) => !e.feito));
  const hero = HERO[situacao.etapa] || HERO.preparando;
  const headline = {
    title: situacao.etapa === 'entregue' ? 'Entregue! 🎉' : situacao.etapa === 'saiu_entrega' ? 'Saiu para entrega 🚚' : situacao.titulo,
    desc: situacao.descricao,
    ...hero,
  };
  const atualizadoEm = fmtDateTime(rastreio?.consultado_em);
  const enderecoEntrega = order.buyer_address || rastreio?.endereco_envio || '';
  const NOME_FONTE = { correios: 'Correios', melhor_rastreio: 'Melhor Rastreio', melhor_envio: 'Melhor Envio' };
  const fonteTexto = (rastreio?.fonte || []).map((f) => NOME_FONTE[f] || f).join(' · ');

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
                <p className="text-[11px] text-emerald-400/80 mt-0.5 flex items-center gap-1 flex-wrap" data-teste="rastreio-atualizado">
                  {emAndamento && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                  {atualizadoEm
                    ? <>Consultado na transportadora às {atualizadoEm.split(' às ')[1]}{fonteTexto ? ` · ${fonteTexto}` : ''}</>
                    : consultando ? 'Consultando a transportadora…' : (emAndamento ? 'Consulta a transportadora a cada minuto' : '')}
                  {!isCanceled && (
                    <button
                      type="button"
                      onClick={() => consultarRastreio(true)}
                      disabled={consultando}
                      data-teste="rastreio-atualizar"
                      className="ml-1 inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-gray-200 hover:bg-white/10 disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3 h-3 ${consultando ? 'animate-spin' : ''}`} /> Atualizar agora
                    </button>
                  )}
                </p>
              </div>
            </div>

            {/* ⚠️ Ocorrência na entrega — o que a transportadora disse e o que fazer */}
            {situacao.etapa === 'problema' && situacao.problema && (
              <div className="mb-6 rounded-xl border border-orange-400/40 bg-orange-500/10 p-4" data-teste="entrega-atencao">
                <p className="text-sm font-black text-orange-200 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> A transportadora registrou uma ocorrência</p>
                <p className="mt-1.5 text-sm text-white font-semibold">“{situacao.problema.texto}”{situacao.problema.detalhe ? ` — ${situacao.problema.detalhe}` : ''}</p>
                {(situacao.problema.data || situacao.problema.local) && (
                  <p className="text-xs text-orange-100/80">{[fmtDateTime(situacao.problema.data), situacao.problema.local].filter(Boolean).join(' · ')}</p>
                )}
                {situacao.orientacao && <p className="mt-2 text-sm text-gray-200 leading-snug"><span className="font-bold text-orange-200">O que fazer:</span> {situacao.orientacao}</p>}
              </div>
            )}

            {/* Timeline vertical com datas — etapas da ENTREGA, nunca do pagamento */}
            {!isCanceled && (
              <div className="relative pl-1" data-teste="linha-do-tempo">
                {steps.map((step, i) => {
                  const active = i === idxAtual && !isDelivered;
                  const Icone = ICONE_ETAPA[step.chave] || Package;
                  const quando = fmtDateTime(step.quando);
                  return (
                    <div key={step.chave} className="relative flex gap-3 pb-5 last:pb-0" data-etapa={step.chave} data-feito={step.feito ? '1' : '0'}>
                      {i < steps.length - 1 && (
                        <span className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${steps[i + 1].feito ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      )}
                      <span className={`relative z-10 grid place-items-center w-8 h-8 rounded-full border shrink-0 ${
                        step.feito
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : active
                            ? (situacao.etapa === 'problema' ? 'bg-orange-500/15 border-orange-400/50 text-orange-300' : 'bg-yellow-500/15 border-yellow-400/40 text-yellow-300 animate-pulse')
                            : 'bg-white/5 border-white/10 text-gray-600'
                      }`}>
                        <Icone className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 pt-1">
                        <p className={`text-sm font-bold leading-tight ${step.feito ? 'text-white' : active ? (situacao.etapa === 'problema' ? 'text-orange-200' : 'text-yellow-200') : 'text-gray-500'}`}>
                          {step.rotulo}
                        </p>
                        {(quando || step.dica) && (
                          <p className="text-xs text-gray-500">{quando || step.dica}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rastreio — código REAL, link da transportadora, número do pedido à parte */}
            {!isCanceled && (
              <div className="mt-5 pt-5 border-t border-white/10" data-teste="bloco-rastreio">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Código de rastreio{transportadora ? ` · ${transportadora}` : ''}{servico ? ` ${servico}` : ''}
                </p>
                {codigo ? (
                  <>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
                      <code className="font-mono text-base sm:text-lg font-bold text-emerald-300 truncate" data-teste="rastreio-codigo">{codigo}</code>
                      <Button size="sm" onClick={() => copyTracking(codigo)} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 font-bold shrink-0">
                        <Copy className="w-4 h-4 mr-1.5" /> Copiar
                      </Button>
                    </div>
                    <div className="mt-2.5 grid sm:grid-cols-2 gap-2">
                      {linkPrincipal && (
                        <a
                          href={linkPrincipal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-teste="rastreio-link-transportadora"
                          className="flex items-center justify-center gap-2 rounded-xl border border-yellow-400/40 bg-yellow-400/10 hover:bg-yellow-400/20 px-3 py-2.5 text-sm font-bold text-yellow-200 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" /> {linkPrincipal.rotulo}
                        </a>
                      )}
                      {links.melhorRastreio && (
                        <a
                          href={links.melhorRastreio}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-teste="rastreio-link-melhor-rastreio"
                          className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2.5 text-sm font-semibold text-gray-200 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" /> Ver no Melhor Rastreio
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300" data-teste="rastreio-sem-codigo">
                    {isPaid
                      ? 'O código de rastreio aparece aqui assim que a transportadora registrar o objeto. Você não precisa fazer nada.'
                      : 'O rastreio começa depois da confirmação do pagamento.'}
                  </div>
                )}
                <p className="mt-2.5 text-xs text-gray-500 flex items-center gap-1.5" data-teste="rastreio-numero-pedido">
                  <Hash className="w-3.5 h-3.5" /> Número do pedido: <code className="font-mono text-gray-300">{numeroInterno}</code>
                  <span className="text-gray-600">(use este número ao falar com o suporte)</span>
                </p>
              </div>
            )}

            {/* Movimentações registradas pela transportadora */}
            {eventos.length > 0 && (
              <div className="mt-5 pt-5 border-t border-white/10" data-teste="rastreio-eventos">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Movimentações da transportadora{fonteTexto ? ` · fonte: ${fonteTexto}` : ''}</p>
                <ol className="space-y-3">
                  {eventos.map((ev, i) => (
                    <li key={`${ev.data || ''}-${i}`} className="flex gap-3">
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${i === 0 ? (situacao.etapa === 'problema' ? 'bg-orange-400' : 'bg-emerald-400') : 'bg-white/20'}`} />
                      <div className="min-w-0">
                        <p className={`text-sm leading-snug ${i === 0 ? 'text-white font-semibold' : 'text-gray-300'}`}>{ev.descricao}{ev.detalhe ? <span className="text-gray-400 font-normal"> — {ev.detalhe}</span> : null}</p>
                        <p className="text-[11px] text-gray-500">{[fmtDateTime(ev.data), ev.local].filter(Boolean).join(' · ')}</p>
                      </div>
                    </li>
                  ))}
                </ol>
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
                  <p className="text-gray-400 flex justify-between"><span>Desconto{order.coupon_code ? ` (${order.coupon_code})` : ''}:</span> <span className="text-yellow-400">− R$ {fmtBR(discount)}</span></p>
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
            {enderecoEntrega && (
              <div className="flex items-start gap-2.5" data-teste="endereco-entrega">
                <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${situacao.etapa === 'problema' ? 'text-orange-300' : 'text-emerald-400'}`} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Entrega para {order.buyer_name || 'você'}</p>
                  <p className="text-sm text-gray-200 leading-snug">{enderecoEntrega}</p>
                  {situacao.etapa === 'problema' && <p className="text-[11px] text-orange-200/90 mt-0.5">Este é o endereço que foi para a etiqueta. Confira se está completo.</p>}
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
