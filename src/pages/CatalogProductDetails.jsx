import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, ShoppingCart, MessageCircle, Maximize2, Share2 } from "lucide-react";
import { toast } from "sonner";
import ComparaiButton from "../components/comparai/ComparaiButton";
import { createPageUrl } from "@/utils";
import { proxyImage } from "@/functions/proxyImage";

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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("Catalog"))}
          className="text-white hover:bg-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex-1 text-center">
          <span className="text-lg font-bold text-green-400">LeilãoNoZap</span>
        </div>

        <div className="w-10"></div>
      </header>

      {/* MAIN CONTENT - DESKTOP LAYOUT */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* COLUNA ESQUERDA - IMAGENS */}
          <div className="space-y-4">
            {/* IMAGEM PRINCIPAL */}
            <div className="relative bg-white rounded-lg overflow-hidden aspect-square">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={product.description}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <span className="text-gray-400">Sem imagem</span>
                </div>
              )}

              {/* NAVEGAÇÃO DE IMAGENS */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md transition-all z-10"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md transition-all z-10"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                </>
              )}

              {/* BOTÃO COMPARTILHAR */}
              <button
                onClick={handleShare}
                className="absolute top-3 left-3 bg-black/40 hover:bg-emerald-600/80 text-white p-2 rounded-full shadow-md transition-all z-10 backdrop-blur-sm border border-white/10"
                title="Compartilhar produto"
              >
                <Share2 className="w-4 h-4" />
              </button>

              {/* BOTÃO FULLSCREEN */}
              <button
                onClick={() => setShowFullscreen(true)}
                className="absolute bottom-3 left-3 bg-white/80 hover:bg-white p-2 rounded-md shadow-md transition-all z-10"
              >
                <Maximize2 className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            {/* THUMBNAILS */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${idx === currentImageIndex ? 'border-green-500' : 'border-gray-600 hover:border-gray-400'
                      }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* COLUNA DIREITA - INFORMAÇÕES */}
          <div className="space-y-6">
            {/* TÍTULO */}
            <h1 className="text-2xl lg:text-3xl font-bold text-white leading-tight">
              {product.description}
            </h1>

            {/* PREÇO */}
            <div className="text-3xl lg:text-4xl font-black text-green-400">
              R$ {product.price_catalog ? product.price_catalog.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"}
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="space-y-3">
              {/* ADICIONAR AO CARRINHO */}
              {(product.quantity === 0 || product.quantity === null || product.quantity === undefined) ? (
                <Button
                  disabled
                  className="w-full h-12 bg-yellow-600 hover:bg-yellow-600 text-white font-bold text-base rounded-lg cursor-not-allowed opacity-90"
                >
                  ESGOTADO
                </Button>
              ) : (
                <Button
                  onClick={handleAddToCart}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-base rounded-lg"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  ADICIONAR AO CARRINHO
                </Button>
              )}

              {/* PEDIR PELO WHATSAPP — conversa direta */}
              <Button
                onClick={handleWhatsAppOrder}
                variant="outline"
                className="w-full h-12 border-2 border-emerald-500 text-emerald-600 hover:text-white hover:bg-emerald-500/10 rounded-lg font-bold bg-transparent shadow-[inset_0_0_12px_rgba(16,185,129,0.4)] hover:shadow-[inset_0_0_18px_rgba(16,185,129,0.6)] transition-shadow duration-300 transition-colors"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                PEDIR PELO WHATSAPP
              </Button>
            </div>

            {/* ESTOQUE */}
            {product.quantity && (
              <p className="text-gray-400 text-sm">
                Estoque disponível: {product.quantity}
              </p>
            )}

            {/* DESCRIÇÃO */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-bold text-white mb-4">Descrição</h3>
              {product.notes ? (
                <div
                  className="text-gray-300 text-sm leading-relaxed prose prose-invert prose-sm max-w-none
                    prose-p:my-2 prose-strong:text-white prose-ul:pl-4 prose-li:my-1"
                  dangerouslySetInnerHTML={{ __html: product.notes }}
                />
              ) : (
                <p className="text-gray-400 text-sm">{product.description}</p>
              )}
            </div>

            {/* CARACTERÍSTICAS (se houver) */}
            {(product.peso || product.comprimento || product.altura || product.largura) && (
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-bold text-white mb-4">Principais características</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  {product.peso && <p>Peso: {product.peso} kg</p>}
                  {(product.comprimento || product.altura || product.largura) && (
                    <p>Dimensões aproximadas: {product.altura && `${product.altura} cm altura`}{product.largura && ` × ${product.largura} cm largura`}{product.comprimento && ` × ${product.comprimento} cm profundidade`}</p>
                  )}
                </div>
              </div>
            )}
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