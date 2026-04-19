import React, { useState, useEffect, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Play, Pause, Edit, Check, MessageCircle } from "lucide-react";
import ComparaiModal from '../comparai/ComparaiModal';
import PrecificaVivoBadge from '../pricing/PrecificaVivoBadge';

function CatalogProductCard({ product, currentUser }) {
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

  const addToCart = (e) => {
    e.stopPropagation();
    
    // Pegar carrinho atual
    const savedCart = localStorage.getItem('catalogCart');
    let cart = savedCart ? JSON.parse(savedCart) : [];
    
    // Verificar se já existe no carrinho
    const existingIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingIndex >= 0) {
      // Incrementar quantidade
      cart[existingIndex].quantity += 1;
      setCartQuantity(cart[existingIndex].quantity);
    } else {
      // Adicionar novo item
      cart.push({
        id: product.id,
        description: product.description,
        price_catalog: product.price_catalog,
        selling_price_wholesale: product.selling_price_wholesale,
        image_urls: product.image_urls,
        quantity: 1,
        availableStock: product.quantity || 999
      });
      setCartQuantity(1);
    }
    
    // Salvar no localStorage
    localStorage.setItem('catalogCart', JSON.stringify(cart));
    
    // Atualiza estado local
    setIsInCart(true);
    
    // Dispara evento para atualizar contador no header
    window.dispatchEvent(new Event('cartUpdated'));
    
    // Abre popup do carrinho
    window.dispatchEvent(new Event('openCartPopup'));
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
    
    navigate(createPageUrl("CatalogProductDetails") + `?id=${product.id}`);
  };

  useEffect(() => {
    return () => stopCarousel();
  }, []);

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const productUrl = `${window.location.origin}${createPageUrl("CatalogProductDetails")}?id=${product.id}`;
    const shareMessage = `🛍️ *LOJA VIRTUAL NOZAP*\n\n📦 *${product.description}*\n\n💚 *R$ ${product.price_catalog?.toFixed(2)}*\n\n🛒 Compre agora:\n${productUrl}`;

    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    const imageUrl = product.image_urls?.[0];
    // Só tenta fetch de imagem em URLs internas (supabase/base44) — URLs externas bloqueiam CORS
    const isInternalImage = imageUrl && (
      imageUrl.includes('supabase.co') || 
      imageUrl.includes('base44') || 
      imageUrl.startsWith('blob:')
    );

    try {
      // 📱 Mobile (iOS + Android) — tenta Web Share API com imagem se URL interna
      if ((isIOS || isAndroid) && navigator.share && navigator.canShare) {
        if (isInternalImage) {
          try {
            const response = await fetch(imageUrl);
            if (response.ok) {
              const blob = await response.blob();
              const file = new File([blob], 'produto.jpg', { type: blob.type || 'image/jpeg' });
              if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                  title: product.description,
                  text: shareMessage,
                  files: [file]
                });
                return;
              }
            }
          } catch (imgError) {
            console.debug('Share com imagem falhou, usando fallback:', imgError.message);
          }
        }

        // Fallback: share sem imagem (mobile)
        if (isIOS) {
          await navigator.share({ title: product.description, text: shareMessage });
          return;
        }
        // Android fallback: abre WhatsApp direto
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`, '_blank');
        return;
      }

      // 💻 DESKTOP
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`, '_blank');
      
    } catch (err) {
      if (err.name !== 'AbortError') {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`, '_blank');
      }
    }
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
                e.target.src = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/bb512aa01_image.png";
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
        <h3 className="font-bold text-white text-xs sm:text-sm line-clamp-2 mb-2">
          {product.description}
        </h3>

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
              <Button
                onClick={addToCart}
                className={`w-full h-10 sm:h-11 text-sm sm:text-base font-bold transition-all ${
                  isInCart 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-green-600 hover:bg-green-700'
                } text-white rounded-lg`}
              >
                {isInCart ? (
                  <>
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    <span>NO CARRINHO</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    <span>ADICIONAR</span>
                  </>
                )}
              </Button>

              {/* COMPARAR PREÇOS */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowComparai(true);
                }}
                className="w-full h-8 sm:h-9 text-[10px] sm:text-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-lg px-2 sm:px-4"
              >
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/d36767bcd_image.png"
                  alt="Comparai"
                  className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0"
                />
                <span className="truncate">COMPARAR PREÇOS</span>
              </Button>

              {/* WHATSAPP */}
              <Button
                onClick={handleShare}
                className="w-full h-8 sm:h-9 text-[10px] sm:text-sm bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold rounded-lg px-2 sm:px-4"
              >
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">WHATSAPP</span>
              </Button>

              {/* MAIS INFORMAÇÕES - LINK */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(createPageUrl("CatalogProductDetails") + `?id=${product.id}`);
                }}
                className="w-full text-center text-xs sm:text-sm text-green-400 hover:text-green-300 font-semibold py-1 underline underline-offset-2"
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
    prevProps.currentUser?.id === nextProps.currentUser?.id
  );
});