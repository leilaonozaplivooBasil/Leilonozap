import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, ShoppingCart, MessageCircle, Maximize2, Share2, Truck, ShieldCheck, RotateCcw, CreditCard, Check, Store, Zap, BadgeCheck, Minus, Plus, Tag, Gavel, Lock } from "lucide-react";
import { toast } from "sonner";
import ComparaiButton from "../components/comparai/ComparaiButton";
import { createPageUrl } from "@/utils";
import { proxyImage } from "@/functions/proxyImage";
import { supabase } from "@/api/supabaseClient";
import { Stars, RatingBadge } from "@/components/loja/StarRating";

const Product = base44.entities.Product;

export default function CatalogProductDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const productId = searchParams.get("id");

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [licenseePhone, setLicenseePhone] = useState(null);
  const [storeRating, setStoreRating] = useState(null);
  const [reviews, setReviews] = useState([]);

  // avaliação da loja (resolve o lojista pelo ref) + reviews recentes
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ref = new URLSearchParams(window.location.search).get('ref') || sessionStorage.getItem('referralCode');
        if (!ref) return;
        const { data: u } = await supabase.from('app_users').select('id').eq('referral_code', ref).limit(1).maybeSingle();
        if (!u?.id) return;
        const [{ data: resumo }, { data: revs }] = await Promise.all([
          supabase.rpc('avaliacao_loja', { _seller: u.id }),
          supabase.from('seller_ratings').select('stars,comment,buyer_name,created_at').eq('seller_id', u.id).not('comment', 'is', null).order('created_at', { ascending: false }).limit(8),
        ]);
        if (alive) { if (resumo) setStoreRating(resumo); setReviews(Array.isArray(revs) ? revs : []); }
      } catch (_) { /* sem avaliação */ }
    })();
    return () => { alive = false; };
  }, []);
  const DEFAULT_STORE_PHONE = '5521984072064';

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (savedUser && isLoggedIn) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (!productId) {
      navigate(createPageUrl("Catalog"));
      return;
    }

    const loadProduct = async () => {
      try {
        const products = await Product.filter({ id: productId });
        if (products && products.length > 0) {
          setProduct(products[0]);
        } else {
          toast.error("Produto não encontrado");
          navigate(createPageUrl("Catalog"));
        }
      } catch (error) {
        console.error("Erro ao carregar produto:", error);
        toast.error("Erro ao carregar produto");
        navigate(createPageUrl("Catalog"));
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [productId, navigate]);

  // Meta tags OG para Loja Virtual (sobrescreve as padrão de leilão)
  useEffect(() => {
    const setMeta = (attr, attrValue, content) => {
      const el = document.querySelector(`meta[${attr}="${attrValue}"]`);
      if (el) el.setAttribute('content', content);
    };

    const ogTitle = product
      ? `${product.description} | Loja Virtual NoZap`
      : 'Loja Virtual NoZap - Produtos com até 60% de desconto';
    const ogDesc = product
      ? `${product.description} por R$ ${product.price_catalog?.toFixed(2)}. Produtos direto de fábrica e devolvidos em até 7 dias. Compre agora!`
      : 'Produtos direto de fábrica e devolvidos em até 7 dias. Eletrônicos, eletrodomésticos, móveis e muito mais. Compre agora!';
    const ogImage = product?.image_urls?.[0] || 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png';

    document.title = ogTitle;
    setMeta('property', 'og:title', ogTitle);
    setMeta('property', 'og:description', ogDesc);
    setMeta('property', 'og:image', ogImage);
    setMeta('name', 'description', ogDesc);
    setMeta('name', 'twitter:title', ogTitle);
    setMeta('name', 'twitter:description', ogDesc);
    setMeta('name', 'twitter:image', ogImage);

    return () => {
      // Restaura padrão ao sair da página
      const defaultTitle = 'NoZap - Loja Virtual e Leilões Online | Até 60% de Desconto';
      const defaultDesc = 'Produtos direto de fábrica e devolvidos em até 7 dias com até 60% de desconto! Loja Virtual e Leilões Online de eletrônicos, eletrodomésticos, móveis e muito mais. Compre agora!';
      const defaultImg = 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png';
      document.title = defaultTitle;
      setMeta('property', 'og:title', defaultTitle);
      setMeta('property', 'og:description', defaultDesc);
      setMeta('property', 'og:image', defaultImg);
      setMeta('name', 'description', defaultDesc);
      setMeta('name', 'twitter:title', defaultTitle);
      setMeta('name', 'twitter:description', defaultDesc);
      setMeta('name', 'twitter:image', defaultImg);
    };
  }, [product]);

  // Busca telefone do licenciado âncora a partir do referral (?ref=)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref') || sessionStorage.getItem('referralCode');
    if (!ref) return;
    (async () => {
      try {
        const users = await base44.entities.AppUser.filter({ referral_code: ref });
        const lic = users && users[0];
        if (lic && (lic.career_levels || []).includes('licenciado_catalogo')) {
          setLicenseePhone(lic.phone || null);
        }
      } catch (e) {
        console.debug('Licensee fetch skipped');
      }
    })();
  }, []);

  const handlePrevImage = () => {
    if (!product?.image_urls || product.image_urls.length === 0) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? product.image_urls.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    if (!product?.image_urls || product.image_urls.length === 0) return;
    setCurrentImageIndex((prev) =>
      prev === product.image_urls.length - 1 ? 0 : prev + 1
    );
  };

  const handleBuyNow = () => {
    console.log('🛒 Botão Comprar clicado!');
    console.log('👤 Current User:', currentUser);
    console.log('📦 Product:', product);

    if (!currentUser) {
      toast.error('Faça login para continuar');
      navigate(createPageUrl("Register"));
      return;
    }

    const checkoutUrl = createPageUrl("CatalogCheckout2") + `?product_id=${product.id}`;
    console.log('🔗 Navegando para:', checkoutUrl);

    sessionStorage.setItem('selectedProduct', JSON.stringify(product));
    navigate(checkoutUrl);
  };

  const getCanonicalProductUrl = () => {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get('ref') || sessionStorage.getItem('referralCode');
    url.protocol = 'https:';
    url.hostname = 'leilaonozap.net';
    if (ref) url.searchParams.set('ref', ref);
    return url.toString();
  };

  const buildShareMessage = (isLicensee) => {
    const productUrl = getCanonicalProductUrl();
    const price = product.price_catalog?.toFixed(2) || '0.00';

    if (isLicensee) {
      return `Olá! Tenho interesse neste produto da *sua Loja Virtual Leilão NoZap*:\n\n📦 *${product.description}*\n\n💚 *R$ ${price}*\n\n🔗 ${productUrl}`;
    }
    return `🛍️ *LOJA VIRTUAL LEILÃO NOZAP*\n\n📦 *${product.description}*\n\n💚 *R$ ${price}*\n\n🛒 Compre agora:\n${productUrl}`;
  };

  const shareWithImage = async (isLicensee, targetNumber) => {
    const imageUrl = product?.image_urls?.[0];
    const message = buildShareMessage(isLicensee);
    const productUrl = getCanonicalProductUrl();
    const waUrl = targetNumber
      ? `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    // NÍVEL 1: Share com imagem via Web Share API
    if (imageUrl && navigator.share && navigator.canShare) {
      try {
        // Resolve URL acessível (proxy se for externa)
        let shareableUrl = imageUrl;
        const isLocalUrl = imageUrl.includes('supabase.co') || imageUrl.includes('base44.app');
        if (!isLocalUrl) {
          const cacheKey = `proxy_img_${imageUrl}`;
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            shareableUrl = cached;
          } else {
            const proxyResult = await proxyImage({ imageUrl });
            if (proxyResult?.data?.file_url) {
              shareableUrl = proxyResult.data.file_url;
              sessionStorage.setItem(cacheKey, shareableUrl);
            }
          }
        }

        const response = await fetch(shareableUrl, { mode: 'cors' });
        if (response.ok) {
          const blob = await response.blob();
          const mimeType = blob.type || 'image/jpeg';
          const ext = mimeType.includes('png') ? '.png' : mimeType.includes('webp') ? '.webp' : '.jpg';
          const fileName = `${(product.description || 'produto').substring(0, 40).replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_')}${ext}`;
          const file = new File([blob], fileName, { type: mimeType });
          
          const shareData = { files: [file] };
          if (navigator.canShare(shareData)) {
            await navigator.share({
              title: product.description,
              text: message,
              url: productUrl,
              files: [file]
            });
            return;
          }
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
        console.debug('Share com imagem falhou, tentando sem imagem:', e.message);
      }
    }

    // NÍVEL 2: Share só texto (sem imagem)
    if (navigator.share) {
      try {
        await navigator.share({ title: product.description, text: message, url: productUrl });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }

    // NÍVEL 3: Abre WhatsApp com texto
    window.open(waUrl, '_blank');
  };

  const handleShare = async () => {
    if (!product) return;
    await shareWithImage(false);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-[10000]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-300">Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center bg-gray-900">
        <div>
          <h2 className="text-xl font-semibold mb-2 text-white">Produto não encontrado</h2>
          <Button
            onClick={() => navigate(createPageUrl("Catalog"))}
            className="bg-green-600 hover:bg-green-700"
          >
            Voltar à Loja Virtual
          </Button>
        </div>
      </div>
    );
  }

  const images = product.image_urls && Array.isArray(product.image_urls) ? product.image_urls : [];
  const currentImage = images.length > 0 ? images[currentImageIndex] : null;

  const handleAddToCart = () => {
    const savedCart = localStorage.getItem('catalogCart');
    let cart = savedCart ? JSON.parse(savedCart) : [];

    const existingIndex = cart.findIndex(item => item.id === product.id);

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
        quantity: quantity,
        availableStock: product.quantity || 999
      });
      toast.success('Produto adicionado ao carrinho!');
    }

    localStorage.setItem('catalogCart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));

    // Abre o popup do carrinho
    window.dispatchEvent(new Event('openCartPopup'));
  };

  const handleWhatsApp = async () => {
    await shareWithImage(false);
  };

  const normalizeToWaNumber = (phone) => {
    const digits = (phone || '').replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('55')) return digits; // já no formato internacional BR
    return `55${digits}`; // assume Brasil
  };

  const handleWhatsAppOrder = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const phone = licenseePhone ? normalizeToWaNumber(licenseePhone) : DEFAULT_STORE_PHONE;
    const ref = new URLSearchParams(window.location.search).get('ref') || sessionStorage.getItem('referralCode');
    const productUrl = getCanonicalProductUrl();
    const message = `Olá! Tenho interesse neste produto da *Loja Virtual Leilão NoZap*:\n\n📦 *${product.description}*\n\n💚 *R$ ${product.price_catalog?.toFixed(2)}*\n\n🛒 Compre agora:\n${productUrl}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // ---- valores derivados (dados reais) ----
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

  const BuyButtons = (
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
  );

  const CARD = 'bg-white/[0.04] border border-white/10 rounded-2xl';

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("Catalog"))} className="text-white hover:bg-gray-800">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 flex items-center justify-center gap-2 text-green-400">
          <Gavel className="w-5 h-5" /><span className="text-lg font-black">Leilão <span className="text-yellow-400">NoZap</span></span>
        </div>
        <button onClick={handleShare} title="Compartilhar" className="w-10 h-10 grid place-items-center rounded-lg text-gray-300 hover:bg-gray-800"><Share2 className="w-5 h-5" /></button>
      </header>

      {/* MAIN */}
      <main className="max-w-6xl mx-auto px-4 py-5">
        {/* breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-4 flex-wrap">
          <button onClick={() => navigate(createPageUrl("Catalog"))} className="hover:text-emerald-300">Loja Virtual</button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <span className="text-gray-300 truncate max-w-[60vw]">{product.description}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

          {/* GALERIA */}
          <div className={`${CARD} p-3 sm:p-4 lg:sticky lg:top-20`}>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              {/* thumbnails verticais no desktop */}
              {images.length > 1 && (
                <div className="flex sm:flex-col gap-2 overflow-auto no-scrollbar sm:max-h-[460px]">
                  {images.map((img, idx) => (
                    <button key={idx} onClick={() => setCurrentImageIndex(idx)}
                      className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all bg-white ${idx === currentImageIndex ? 'border-green-500' : 'border-white/10 hover:border-white/30'}`}>
                      <img src={img} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
              {/* imagem principal */}
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

              <h1 className="text-xl sm:text-2xl font-bold leading-snug">{product.description}</h1>

              {storeRating && storeRating.total > 0 && (
                <RatingBadge media={storeRating.media} total={storeRating.total} size={15} />
              )}

              <div>
                {hasDiscount && <p className="text-gray-500 line-through text-sm">{money(market)}</p>}
                <div className="flex items-end gap-2 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-black text-green-400">{money(price)}</span>
                  {hasDiscount && <span className="mb-1 text-xs font-black text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded">{discountPct}% OFF</span>}
                </div>
                <p className="text-sm text-gray-400 mt-1">em até <b className="text-gray-200">12x {money(parcela12)}</b> · ou no <b className="text-emerald-300">PIX</b></p>
              </div>

              {/* quantidade */}
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

              {BuyButtons}

              {/* benefícios */}
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
          </div>
        </div>

        {/* SEÇÕES INFERIORES (largura da galeria) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 mt-6 items-start">
          <div className="space-y-6 min-w-0">
            {/* características */}
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

            {/* descrição */}
            <div className={`${CARD} p-5`}>
              <h3 className="text-lg font-black mb-4">Descrição</h3>
              {product.notes ? (
                <div className="text-gray-300 text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-2 prose-strong:text-white prose-ul:pl-4 prose-li:my-1"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.notes) }} />
              ) : (
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{product.description}</p>
              )}
            </div>

            {/* avaliações da loja (reais) */}
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
          </div>

          {/* meios de pagamento (coluna direita) */}
          <div className={`${CARD} p-5 space-y-4`}>
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
      </main>

      {/* MODAL FULLSCREEN */}
      {showFullscreen && currentImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <ArrowLeft className="w-8 h-8" />
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

      {/* COMPARAI BUTTON FLUTUANTE */}
      {product && (
        <div className="fixed bottom-4 right-4 z-40">
          <ComparaiButton
            auction={{
              id: product.id,
              title: product.description,
              current_price: product.price_catalog,
              image_urls: images
            }}
            mode="catalog"
          />
        </div>
      )}
    </div>
  );
}