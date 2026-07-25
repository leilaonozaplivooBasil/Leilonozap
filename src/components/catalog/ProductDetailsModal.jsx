import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { supabase } from "@/api/supabaseClient";
import { Stars, RatingBadge } from "@/components/loja/StarRating";
import {
  X, ChevronLeft, ChevronRight, ShoppingCart, MessageCircle, Truck, ShieldCheck,
  RotateCcw, CreditCard, Check, Store, Zap, BadgeCheck, Minus, Plus, Tag, Lock, Maximize2, ExternalLink
} from "lucide-react";

const DEFAULT_STORE_PHONE = '5521984072064';

// Detalhe do produto DENTRO da própria Loja Virtual (pedido Gabriel 25/07): o clique no
// card abre este modal por cima do catálogo, com TODAS as informações da página de
// detalhes (galeria, preço, compra, WhatsApp, descrição, avaliações e pagamento) —
// sem tirar o cliente da página. A página CatalogProductDetails continua existindo
// para links compartilhados (WhatsApp/OG).
export default function ProductDetailsModal({ product, currentUser, licenseePhone, storeRating, onClose }) {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // ⛔ trava o scroll do catálogo enquanto o modal está aberto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // 🔙 botão VOLTAR do navegador/celular fecha o modal (não sai da loja)
  useEffect(() => {
    window.history.pushState({ produtoModal: product.id }, '');
    const onPop = () => onCloseRef.current();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [product.id]);

  const close = () => {
    // desfaz o pushState acima — o popstate dispara o onClose
    if (window.history.state?.produtoModal === product.id) window.history.back();
    else onCloseRef.current();
  };

  // ESC fecha
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // avaliações com comentário da loja (mesma fonte da página de detalhes)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ref = new URLSearchParams(window.location.search).get('ref') || sessionStorage.getItem('referralCode');
        if (!ref) return;
        const { data: u } = await supabase.from('app_users').select('id').eq('referral_code', ref).limit(1).maybeSingle();
        if (!u?.id) return;
        const { data: revs } = await supabase.from('seller_ratings').select('stars,comment,buyer_name,created_at').eq('seller_id', u.id).not('comment', 'is', null).order('created_at', { ascending: false }).limit(8);
        if (alive) setReviews(Array.isArray(revs) ? revs : []);
      } catch (_) { /* sem avaliação */ }
    })();
    return () => { alive = false; };
  }, [product.id]);

  const images = Array.isArray(product.image_urls) ? product.image_urls : [];
  const currentImage = images.length > 0 ? images[currentImageIndex] : null;

  const handlePrevImage = () => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  const handleNextImage = () => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));

  const getProductUrl = () => {
    const ref = new URLSearchParams(window.location.search).get('ref') || sessionStorage.getItem('referralCode');
    return `https://leilaonozap.net${createPageUrl("CatalogProductDetails")}?id=${product.id}${ref ? '&ref=' + ref : ''}`;
  };

  const handleBuyNow = () => {
    if (!currentUser) {
      toast.error('Faça login para continuar');
      navigate(createPageUrl("Register"));
      return;
    }
    sessionStorage.setItem('selectedProduct', JSON.stringify(product));
    navigate(createPageUrl("CatalogCheckout2") + `?product_id=${product.id}`);
  };

  const handleAddToCart = () => {
    const savedCart = localStorage.getItem('catalogCart');
    let cart = savedCart ? JSON.parse(savedCart) : [];
    const existingIndex = cart.findIndex((item) => item.id === product.id);
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
      toast.success(`Quantidade atualizada: ${cart[existingIndex].quantity}x`);
    } else {
      cart.push({
        id: product.id,
        description: product.description,
        price_catalog: product.price_catalog,
        selling_price_wholesale: product.selling_price_wholesale,
        image_urls: product.image_urls,
        quantity,
        availableStock: product.quantity || 999
      });
      toast.success('Produto adicionado ao carrinho!');
    }
    localStorage.setItem('catalogCart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    window.dispatchEvent(new Event('openCartPopup'));
  };

  const handleWhatsAppOrder = () => {
    const phone = licenseePhone ? `55${licenseePhone.replace(/\D/g, '')}` : DEFAULT_STORE_PHONE;
    const message = `Olá! Tenho interesse neste produto da *Loja Virtual Leilão NoZap*:\n\n📦 *${product.description}*\n\n💚 *R$ ${product.price_catalog?.toFixed(2)}*\n\n🛒 Compre agora:\n${getProductUrl()}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // ---- valores derivados (mesma régua da página de detalhes) ----
  const money = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const price = Number(product.price_catalog) || 0;
  const market = Number(product.market_value) || 0;
  const hasDiscount = market > price && price > 0;
  const discountPct = hasDiscount ? Math.round((1 - price / market) * 100) : 0;
  const parcela12 = price / 12;
  const stock = Number(product.quantity) || 0;
  const inStock = stock > 0;
  const specs = [
    product.peso ? { label: 'Peso', value: `${product.peso} kg` } : null,
    product.altura ? { label: 'Altura', value: `${product.altura} cm` } : null,
    product.largura ? { label: 'Largura', value: `${product.largura} cm` } : null,
    product.comprimento ? { label: 'Profundidade', value: `${product.comprimento} cm` } : null,
  ].filter(Boolean);

  const CARD = 'bg-white/[0.04] border border-white/10 rounded-2xl';

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto"
      onClick={close}
    >
      <div
        className="relative w-full max-w-6xl bg-gray-900 text-white sm:rounded-2xl border border-white/10 shadow-2xl my-0 sm:my-8 min-h-full sm:min-h-0 sm:max-h-[92vh] sm:overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* topo fixo com fechar */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3 bg-gray-900/95 backdrop-blur border-b border-white/10 sm:rounded-t-2xl">
          <p className="font-bold text-sm sm:text-base truncate">{product.description}</p>
          <button
            onClick={close}
            aria-label="Fechar"
            className="shrink-0 w-9 h-9 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">

            {/* GALERIA */}
            <div className={`${CARD} p-3 sm:p-4`}>
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                {images.length > 1 && (
                  <div className="flex sm:flex-col gap-2 overflow-auto no-scrollbar sm:max-h-[420px]">
                    {images.map((img, idx) => (
                      <button key={idx} onClick={() => setCurrentImageIndex(idx)}
                        className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all bg-white ${idx === currentImageIndex ? 'border-green-500' : 'border-white/10 hover:border-white/30'}`}>
                        <img src={img} alt="" className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative flex-1 bg-white rounded-xl overflow-hidden aspect-square">
                  {currentImage ? (
                    <img src={currentImage} alt={product.description} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full grid place-items-center bg-gray-100"><span className="text-gray-400">Sem imagem</span></div>
                  )}
                  {hasDiscount && (
                    <span className="absolute top-3 right-3 text-xs font-black text-white px-2.5 py-1 rounded-lg inline-flex items-center gap-1" style={{ background: 'linear-gradient(135deg,#e0a92e,#d4880b)' }}>
                      <Tag className="w-3.5 h-3.5" /> -{discountPct}%
                    </span>
                  )}
                  {images.length > 1 && (
                    <>
                      <button onClick={handlePrevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white p-2 rounded-full shadow-md z-10"><ChevronLeft className="w-5 h-5 text-gray-700" /></button>
                      <button onClick={handleNextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white p-2 rounded-full shadow-md z-10"><ChevronRight className="w-5 h-5 text-gray-700" /></button>
                    </>
                  )}
                  <button onClick={() => setShowFullscreen(true)} className="absolute bottom-3 right-3 bg-white/85 hover:bg-white p-2 rounded-md shadow-md z-10" title="Ampliar"><Maximize2 className="w-4 h-4 text-gray-700" /></button>
                </div>
              </div>
            </div>

            {/* BUY BOX */}
            <div className="space-y-4">
              <div className={`${CARD} p-4 sm:p-5 space-y-4`}>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-300 font-semibold inline-flex items-center gap-1"><BadgeCheck className="w-4 h-4" /> Novo</span>
                  {inStock && <><span className="text-gray-600">·</span><span className="text-gray-400">{stock} disponíve{stock > 1 ? 'is' : 'l'}</span></>}
                </div>

                <h2 className="text-lg sm:text-xl font-bold leading-snug">{product.description}</h2>

                {storeRating && storeRating.total > 0 && (
                  <RatingBadge media={storeRating.media} total={storeRating.total} size={15} />
                )}

                <div>
                  {hasDiscount && <p className="text-gray-500 line-through text-sm">{money(market)}</p>}
                  <div className="flex items-end gap-2 flex-wrap">
                    <span className="text-3xl font-black text-green-400">{money(price)}</span>
                    {hasDiscount && <span className="mb-1 text-xs font-black text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded">{discountPct}% OFF</span>}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">em até <b className="text-gray-200">12x {money(parcela12)}</b> · ou no <b className="text-emerald-300">PIX</b></p>
                </div>

                {inStock && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">Quantidade:</span>
                    <div className="inline-flex items-center rounded-lg border border-white/15 overflow-hidden">
                      <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-9 h-9 grid place-items-center hover:bg-white/10 disabled:opacity-40" disabled={quantity <= 1}><Minus className="w-4 h-4" /></button>
                      <span className="w-10 text-center font-bold tabular-nums">{quantity}</span>
                      <button onClick={() => setQuantity((q) => Math.min(stock, q + 1))} className="w-9 h-9 grid place-items-center hover:bg-white/10 disabled:opacity-40" disabled={quantity >= stock}><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  {inStock ? (
                    <>
                      <button onClick={handleBuyNow} className="w-full h-12 rounded-xl font-black text-[#052e16] text-base flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[.99]" style={{ background: 'linear-gradient(90deg,#f5c451,#22c55e)' }}>
                        <Zap className="w-5 h-5 fill-current" /> COMPRAR AGORA
                      </button>
                      <button onClick={handleAddToCart} className="w-full h-12 rounded-xl font-bold text-white text-base bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center gap-2 transition-colors">
                        <ShoppingCart className="w-5 h-5" /> Adicionar ao carrinho
                      </button>
                    </>
                  ) : (
                    <button disabled className="w-full h-12 rounded-xl font-bold text-white bg-yellow-600/80 cursor-not-allowed opacity-90">Esgotado</button>
                  )}
                  <button onClick={handleWhatsAppOrder} className="w-full h-12 rounded-xl font-bold text-emerald-300 border-2 border-emerald-500/60 hover:bg-emerald-500/10 flex items-center justify-center gap-2 transition-colors">
                    <MessageCircle className="w-5 h-5" /> Pedir pelo WhatsApp
                  </button>
                </div>

                <div className="pt-2 space-y-2.5 text-sm">
                  <div className="flex items-start gap-2.5"><Truck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /><span className="text-gray-300"><b className="text-white">Entrega para todo o Brasil</b> — combine o frete no WhatsApp.</span></div>
                  <div className="flex items-start gap-2.5"><RotateCcw className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /><span className="text-gray-300"><b className="text-white">Devolução em até 7 dias</b> após o recebimento.</span></div>
                  <div className="flex items-start gap-2.5"><ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /><span className="text-gray-300"><b className="text-white">Compra garantida</b> — receba o produto ou seu dinheiro de volta.</span></div>
                  <div className="flex items-start gap-2.5"><Lock className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /><span className="text-gray-300"><b className="text-white">Pagamento seguro</b> — PIX, cartão em até 12x ou boleto.</span></div>
                </div>
              </div>

              {/* card da loja/vendedor */}
              <div className={`${CARD} p-4 flex items-center gap-3`}>
                <span className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: 'conic-gradient(from 200deg,#0e4d38,#0a2c22)', border: '1px solid rgba(245,196,81,.35)' }}><Store className="w-5 h-5 text-yellow-300" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate">Loja Virtual Leilão NoZap</p>
                  <p className="text-xs text-gray-400">Vendedor oficial · Descontos de verdade</p>
                </div>
                <button onClick={handleWhatsAppOrder} className="shrink-0 text-xs font-bold px-3 py-2 rounded-lg text-[#052e16]" style={{ background: '#25D366' }}>Falar</button>
              </div>

              {/* meios de pagamento */}
              <div className={`${CARD} p-4 sm:p-5 space-y-4`}>
                <h3 className="font-black flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-400" /> Meios de pagamento</h3>
                <div>
                  <p className="text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wide">PIX</p>
                  <p className="text-sm text-emerald-300 font-bold">Aprovação na hora · à vista</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wide">Cartão de crédito</p>
                  <p className="text-sm text-gray-200">Em até <b>12x {money(parcela12)}</b></p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wide">Boleto bancário</p>
                  <p className="text-sm text-gray-200">Compensação em 1–2 dias úteis</p>
                </div>
                <div className="pt-1 flex items-center gap-2 text-xs text-gray-400"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Ambiente 100% seguro</div>
              </div>
            </div>
          </div>

          {/* SEÇÕES INFERIORES */}
          <div className="space-y-5 mt-5">
            {specs.length > 0 && (
              <div className={`${CARD} p-5`}>
                <h3 className="text-lg font-black mb-4 flex items-center gap-2"><BadgeCheck className="w-5 h-5 text-emerald-400" /> Características do produto</h3>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                  {specs.map((sp) => (
                    <div key={sp.label} className="flex items-center gap-2.5 text-sm border-b border-white/5 pb-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-gray-400">{sp.label}:</span> <span className="text-white font-semibold">{sp.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={`${CARD} p-5`}>
              <h3 className="text-lg font-black mb-4">Descrição</h3>
              {product.notes ? (
                <div className="text-gray-300 text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-2 prose-strong:text-white prose-ul:pl-4 prose-li:my-1"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.notes) }} />
              ) : (
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{product.description}</p>
              )}
            </div>

            {storeRating && storeRating.total > 0 && (
              <div className={`${CARD} p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black">Avaliações da loja</h3>
                  <RatingBadge media={storeRating.media} total={storeRating.total} size={15} />
                </div>
                {reviews.length === 0 ? (
                  <p className="text-gray-500 text-sm">As avaliações com comentário aparecem aqui.</p>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((r, i) => (
                      <div key={i} className="bg-black/20 border border-white/10 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-white">{r.buyer_name || 'Cliente'}</span>
                          <Stars value={r.stars} size={13} />
                        </div>
                        {r.comment && <p className="text-gray-300 text-sm">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* link para a página completa (compartilhável) */}
            <div className="flex justify-center pb-2">
              <a
                href={`${createPageUrl("CatalogProductDetails")}?id=${product.id}`}
                onClick={(e) => { e.preventDefault(); navigate(createPageUrl("CatalogProductDetails") + `?id=${product.id}`); }}
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir página completa do produto
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN da imagem */}
      {showFullscreen && currentImage && (
        <div
          className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center p-4"
          onClick={(e) => { e.stopPropagation(); setShowFullscreen(false); }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setShowFullscreen(false); }}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            aria-label="Fechar imagem"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={currentImage}
            alt={product.description}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-3 rounded-full"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-3 rounded-full"
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
