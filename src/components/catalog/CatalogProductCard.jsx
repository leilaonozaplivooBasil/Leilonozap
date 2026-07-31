import React, { useState, useEffect, useRef, memo } from "react";
import { fmtBR } from '@/lib/money';
import CompareAquiIcon from '@/assets/compareaqui-icon.webp';
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Play, Pause, Edit, Check, MessageCircle, Share2, Plus, Minus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import ComparaiModal from '../comparai/ComparaiModal';
import PrecificaVivoBadge from '../pricing/PrecificaVivoBadge';
import { proxyImage } from "@/functions/proxyImage";
import { Stars } from '../loja/StarRating';
import { getReferral } from '@/lib/referral';

const DEFAULT_STORE_PHONE = '5521984072064';

// onOpenDetails: quando presente (Loja Virtual), o clique abre o produto EXPANDIDO na
// própria página (ProductDetailsModal) em vez de navegar — pedido Gabriel 25/07.
function CatalogProductCard({ product, currentUser, licenseePhone, storeRating, onOpenDetails }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [showComparai, setShowComparai] = useState(false);
    const [isInCart, setIsInCart] = useState(false);
    const [cartQuantity, setCartQuantity] = useState(0);
    const intervalRef = useRef(null);
    const navigate = useNavigate();

    // Verifica se o produto já está no carrinho ao montar e quando o carrinho muda
    useEffect(() => {
      const checkCart = () => {
        const savedCart = localStorage.getItem('catalogCart');
        if (savedCart) {
          const cart = JSON.parse(savedCart);
          const item = cart.find(item => item.id === product.id);
          setIsInCart(!!item);
          setCartQuantity(item?.quantity || 0);
        } else {
          setIsInCart(false);
          setCartQuantity(0);
        }
      };
      
      checkCart();
      
      // Escuta evento de atualização do carrinho
      window.addEventListener('cartUpdated', checkCart);
      return () => window.removeEventListener('cartUpdated', checkCart);
    }, [product.id]);

  // Limite real de unidades: o estoque do produto (quantity). Sem estoque definido → sem limite prático.
  const maxStock = Number(product.quantity) > 0 ? Number(product.quantity) : 999;

  // Soma unidades no carrinho SEM sair da página, respeitando o estoque.
  // openPopup: o ADICIONAR principal abre o popup do carrinho; o botão "+" só soma
  // (permite cliques rápidos em sequência pra levar várias unidades).
  const addUnit = (e, { openPopup = false } = {}) => {
    e.stopPropagation();

    const savedCart = localStorage.getItem('catalogCart');
    let cart = savedCart ? JSON.parse(savedCart) : [];

    const existingIndex = cart.findIndex(item => item.id === product.id);
    const currentQty = existingIndex >= 0 ? (Number(cart[existingIndex].quantity) || 0) : 0;

    if (currentQty >= maxStock) {
      toast({
        title: '🚫 Limite do estoque',
        description: `Este produto tem apenas ${maxStock} unidade${maxStock > 1 ? 's' : ''} disponíve${maxStock > 1 ? 'is' : 'l'} — todas já estão no seu carrinho.`,
        duration: 2500,
      });
      return;
    }

    if (existingIndex >= 0) {
      cart[existingIndex].quantity = currentQty + 1;
      cart[existingIndex].availableStock = maxStock;
      setCartQuantity(currentQty + 1);
    } else {
      cart.push({
        id: product.id,
        description: product.description,
        price_catalog: product.price_catalog,
        selling_price_wholesale: product.selling_price_wholesale,
        image_urls: product.image_urls,
        quantity: 1,
        availableStock: maxStock
      });
      setCartQuantity(1);
    }

    localStorage.setItem('catalogCart', JSON.stringify(cart));
    setIsInCart(true);

    // Atualiza contador no header
    window.dispatchEvent(new Event('cartUpdated'));

    if (openPopup) {
      window.dispatchEvent(new Event('openCartPopup'));
    }
  };

  // Diminui uma unidade direto do card (0 unidades → sai do carrinho)
  const removeUnit = (e) => {
    e.stopPropagation();
    const savedCart = localStorage.getItem('catalogCart');
    let cart = savedCart ? JSON.parse(savedCart) : [];
    const existingIndex = cart.findIndex(item => item.id === product.id);
    if (existingIndex < 0) return;

    const currentQty = Number(cart[existingIndex].quantity) || 0;
    if (currentQty <= 1) {
      cart.splice(existingIndex, 1);
      setCartQuantity(0);
      setIsInCart(false);
    } else {
      cart[existingIndex].quantity = currentQty - 1;
      setCartQuantity(currentQty - 1);
    }
    localStorage.setItem('catalogCart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const images = (product.image_urls && product.image_urls.length > 0)
    ? product.image_urls
    : [];

  const startCarousel = () => {
    if (images.length <= 1) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentImageIndex(prevIndex => (prevIndex + 1) % images.length);
    }, 1500);
  };

  const stopCarousel = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (!isPaused) {
      startCarousel();
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    stopCarousel();
    setCurrentImageIndex(0);
    setIsPaused(false);
  };

  const handleImageClick = (e) => {
    e.preventDefault();
    if (images.length <= 1) return;

    const newPausedState = !isPaused;
    setIsPaused(newPausedState);

    if (newPausedState) {
      stopCarousel();
    } else {
      startCarousel();
    }
  };

  const handleCardClick = (e) => {
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }

    if (!product || !product.id) {
      console.error("❌ Tentativa de abrir produto sem ID!");
      alert("Erro: Produto inválido");
      return;
    }

    if (onOpenDetails) {
      onOpenDetails(product);
      return;
    }
    navigate(createPageUrl("CatalogProductDetails") + `?id=${product.id}`);
  };

  useEffect(() => {
    return () => stopCarousel();
  }, []);

  // PEDIR PELO WHATSAPP — conversa direta com licenciado ou loja
  const handleWhatsAppOrder = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const ref = getReferral();
    const productUrl = `${window.location.origin}/p/${product.id}${ref ? '?ref=' + ref : ''}`; // rota server-side: preview do WhatsApp com a FOTO do produto
    const phone = licenseePhone ? `55${licenseePhone.replace(/\D/g, '')}` : DEFAULT_STORE_PHONE;
    const message = `Olá! Tenho interesse neste produto da *Loja Virtual Leilão NoZap*:\n\n📦 *${product.description}*\n\n💚 *R$ ${fmtBR(product.price_catalog)}*\n\n🛒 Compre agora:\n${productUrl}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // COMPARTILHAR — Web Share API com imagem, fallback WhatsApp texto
  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const ref = getReferral();
    const productUrl = `${window.location.origin}/p/${product.id}${ref ? '?ref=' + ref : ''}`; // rota server-side: preview do WhatsApp com a FOTO do produto
    const shareMessage = `🛍️ *LOJA VIRTUAL LEILÃO NOZAP*\n\n📦 *${product.description}*\n\n💚 *R$ ${fmtBR(product.price_catalog)}*\n\n🛒 Compre agora:\n${productUrl}`;
    const imageUrl = product.image_urls?.[0];

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
              text: shareMessage,
              url: productUrl,
              files: [file]
            });
            return;
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.debug('Share com imagem falhou, tentando sem imagem:', err.message);
      }
    }

    // NÍVEL 2: Share só texto (sem imagem)
    if (navigator.share) {
      try {
        await navigator.share({ title: product.description, text: shareMessage, url: productUrl });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // NÍVEL 3: Abre WhatsApp com texto
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const currentImage = images.length > 0 ? images[currentImageIndex] : null;
  const hasMultipleImages = images && images.length > 1;

  const categoryEmojis = {
    eletronicos: "📱",
    eletrodomesticos: "🔌",
    moveis_decoracao: "🛋️",
    casa_jardim: "🏡",
    ferramentas: "🛠️",
    roupas_acessorios: "👕",
    esportes_lazer: "⚽",
    brinquedos_hobbies: "🧸",
    livros_midia: "📚",
    veiculos_pecas: "🚗",
    instrumentos_musicais: "🎸",
    beleza_cuidado_pessoal: "💅",
    outros: "🎯"
  };

  return (
    <>
    <Card 
      className="group relative overflow-hidden bg-gray-800/50 backdrop-blur-sm border border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/10 cursor-pointer flex flex-col"
      onClick={handleCardClick}
    >
      <div 
        className="relative overflow-hidden w-full aspect-square bg-white"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleImageClick}
      >
        <div className="w-full h-full">
          {images.map((img, index) => (
            <img 
              key={index}
              src={img}
              alt={`${product.description} - imagem ${index + 1}`}
              loading="lazy"
              decoding="async"
              className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-300 ease-in-out max-w-full ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ maxHeight: '100%', height: 'auto' }}
              onError={(e) => {
                e.target.src = "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/bb512aa01_image.png";
                e.target.classList.add('p-4');
              }}
            />
          ))}
          
          <div 
            className={`absolute top-0 left-0 w-full h-full bg-white flex items-center justify-center transition-opacity duration-300 ${
              images.length > 0 ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">📦</div>
              <p className="text-sm">Sem Imagem</p>
            </div>
          </div>
        </div>

        {/* Ícone de Play/Pause */}
        {isHovering && images.length > 1 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 rounded-full w-14 h-14 flex items-center justify-center pointer-events-none transition-opacity duration-200">
            {isPaused ? (
              <Play className="w-7 h-7 text-white fill-white" />
            ) : (
              <Pause className="w-7 h-7 text-white fill-white" />
            )}
          </div>
        )}
        
        {/* Botão de compartilhar - CANTO SUPERIOR ESQUERDO */}
        <div className="absolute top-2 left-2 z-20">
          <button
            onClick={handleShare}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="min-h-[36px] min-w-[36px] h-9 w-9 shadow-md bg-black/40 hover:bg-emerald-600/80 text-white rounded-full transition-all duration-300 flex items-center justify-center backdrop-blur-sm cursor-pointer active:scale-95 border border-white/10"
            title="Compartilhar produto"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Botão de edição - CANTO SUPERIOR DIREITO (apenas admin) */}
        {currentUser?.role === 'admin' && (
          <div className="absolute top-2 right-2 z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(createPageUrl("AddCatalogProduct"), { 
                  state: { sourceProduct: product }
                });
              }}
              onMouseDown={(e) => e.stopPropagation()} 
              onTouchStart={(e) => e.stopPropagation()}
              className="min-h-[40px] min-w-[40px] h-9 px-2 gap-1 shadow-md bg-gray-700/40 hover:bg-gray-600/60 text-white rounded-lg transition-all duration-300 flex items-center justify-center backdrop-blur-sm cursor-pointer active:scale-95 border border-gray-600/30"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Indicadores de imagem - EMBAIXO */}
        {hasMultipleImages && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, idx) => (
              <div key={idx} className={`rounded-full transition-all ${idx === currentImageIndex ? 'w-2 h-2 bg-white' : 'w-1.5 h-1.5 bg-white/60'}`} />
            ))}
          </div>
        )}
      </div>
      
      <CardContent className="p-2 sm:p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-white text-xs sm:text-sm line-clamp-2 mb-1">
          {product.description}
        </h3>

        {/* avaliação da loja */}
        {storeRating && storeRating.total > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Stars value={storeRating.media} size={12} />
            <span className="text-[10px] text-gray-400">{Number(storeRating.media).toFixed(1)} ({storeRating.total})</span>
          </div>
        )}

        <div className="mb-2 sm:mb-4">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-gray-400 text-[10px] sm:text-xs">Preço</p>
            <PrecificaVivoBadge lastUpdate={product.last_dynamic_update} size="sm" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-green-400">
            R$ {product.price_catalog ? product.price_catalog.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"}
          </p>
          {product.quantity && (
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Estoque: {product.quantity}</p>
          )}
        </div>

        <div className="space-y-1.5 sm:space-y-2 mt-auto">
          {/* BOTÃO ADICIONAR - PRINCIPAL */}
          {(product.quantity === 0 || product.quantity === null || product.quantity === undefined) ? (
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-black text-yellow-500 mb-1">ESGOTADO</p>
              </div>
            </div>
          ) : (
            <>
              {/* ADICIONAR + botão "+" ao lado: soma unidades sem sair da página,
                  respeitando o estoque (pedido Gabriel 25/07) */}
              <div className="flex gap-1.5 sm:gap-2">
                <Button
                  onClick={(e) => addUnit(e, { openPopup: true })}
                  className="flex-1 min-w-0 h-10 sm:h-11 text-sm sm:text-base font-bold transition-all bg-green-600 hover:bg-green-700 text-white rounded-lg px-2"
                >
                  {isInCart ? (
                    <>
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 flex-shrink-0" />
                      <span className="truncate">NO CARRINHO{cartQuantity > 1 ? ` · ${cartQuantity}` : ''}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 flex-shrink-0" />
                      <span className="truncate">ADICIONAR</span>
                    </>
                  )}
                </Button>
                {isInCart && (
                  <Button
                    onClick={removeUnit}
                    title={cartQuantity <= 1 ? 'Remover do carrinho' : 'Tirar uma unidade'}
                    className="h-10 sm:h-11 w-10 sm:w-11 flex-shrink-0 rounded-lg bg-gray-700 hover:bg-red-600/80 text-white font-bold border border-white/15 p-0 transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </Button>
                )}
                <Button
                  onClick={(e) => addUnit(e)}
                  disabled={cartQuantity >= maxStock}
                  title={cartQuantity >= maxStock ? `Estoque máximo (${maxStock}) já no carrinho` : 'Adicionar mais uma unidade'}
                  className="relative h-10 sm:h-11 w-10 sm:w-11 flex-shrink-0 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold border border-green-400/40 disabled:opacity-40 disabled:cursor-not-allowed p-0"
                >
                  <Plus className="w-5 h-5" />
                  {cartQuantity > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-yellow-400 text-green-950 text-[10px] font-black grid place-items-center shadow">
                      {cartQuantity}
                    </span>
                  )}
                </Button>
              </div>

              {/* COMPARAR PREÇOS */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowComparai(true);
                }}
                className="w-full h-11 sm:h-9 text-[10px] sm:text-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-lg px-2 sm:px-4"
              >
                <img
                  src={CompareAquiIcon}
                  alt="CompareAQUI"
                  className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0"
                />
                <span className="truncate">COMPARAR PREÇOS</span>
              </Button>

              {/* PEDIR PELO WHATSAPP — conversa direta */}
              <Button
                onClick={handleWhatsAppOrder}
                variant="outline"
                className="w-full h-11 sm:h-9 text-[10px] sm:text-sm border-2 border-emerald-500 text-emerald-500 hover:text-white hover:bg-emerald-500/10 rounded-lg font-bold bg-transparent px-2 sm:px-4 transition-shadow duration-300"
                style={{ boxShadow: 'inset 0 0 12px rgba(16,185,129,0.4)' }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'inset 0 0 18px rgba(16,185,129,0.6)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'inset 0 0 12px rgba(16,185,129,0.4)'}
              >
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">PEDIR PELO WHATSAPP</span>
              </Button>

              {/* MAIS INFORMAÇÕES - LINK */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenDetails) { onOpenDetails(product); return; }
                  navigate(createPageUrl("CatalogProductDetails") + `?id=${product.id}`);
                }}
                className="w-full min-h-[44px] sm:min-h-0 text-center text-xs sm:text-sm text-green-400 hover:text-green-300 font-semibold py-2.5 sm:py-1 underline underline-offset-2"
              >
                MAIS INFORMAÇÕES
              </button>
            </>
          )}
        </div>
      </CardContent>
    </Card>

      {/* Modal Comparai */}
      {showComparai && (
        <ComparaiModal 
          auction={{
            id: product.id,
            title: product.description,
            current_price: product.price_catalog,
            starting_price: product.price_catalog,
            image_urls: product.image_urls,
            category: product.category
          }}
          isProduct={true}
          onClose={() => setShowComparai(false)} 
        />
      )}
    </>
  );
}

export default memo(CatalogProductCard, (prevProps, nextProps) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.currentUser?.id === nextProps.currentUser?.id &&
    prevProps.licenseePhone === nextProps.licenseePhone &&
    prevProps.storeRating?.media === nextProps.storeRating?.media &&
    prevProps.storeRating?.total === nextProps.storeRating?.total
  );
});