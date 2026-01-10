import React, { useState, useEffect, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Play, Pause, Share2, Info, Edit } from "lucide-react";
import FavoriteButton from '../recommendations/FavoriteButton';
import ComparaiModal from '../comparai/ComparaiModal';

function CatalogProductCard({ product, currentUser }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [showComparai, setShowComparai] = useState(false);
    const intervalRef = useRef(null);
    const navigate = useNavigate();

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
    const shareMessage = `🛍️ CATÁLOGO NOZAP!

📱 ${product.description}
💰 R$ ${product.price_catalog?.toFixed(2)}

🛒 Compre agora!`;

    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    try {
      if (isIOS && navigator.share && navigator.canShare) {
        await navigator.share({
          title: `🛍️ ${product.description}`,
          text: shareMessage,
        });
        return;
      }

      if (isAndroid) {
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
        window.open(whatsappUrl, '_blank');
        return;
      }

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
        
        {/* Badge de categoria - CANTO SUPERIOR ESQUERDO */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          <Badge className="bg-black/80 text-white text-xs">
            {categoryEmojis[product.category] || '📦'} Catálogo
          </Badge>
        </div>

        {/* Botões de ação - CANTO SUPERIOR DIREITO */}
        <div className="absolute top-2 right-2 z-20 flex gap-2">
          {currentUser && (
            <FavoriteButton 
              auctionId={product.id} 
              userId={currentUser.id} 
              size="sm"
            />
          )}

          <button
            onClick={handleShare}
            onMouseDown={(e) => e.stopPropagation()} 
            onTouchStart={(e) => e.stopPropagation()}
            className="min-h-[40px] min-w-[40px] h-9 px-2 gap-1 shadow-md bg-blue-600/90 hover:bg-blue-500 text-white rounded-lg transition-all duration-300 flex items-center justify-center backdrop-blur-sm cursor-pointer active:scale-95"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {currentUser?.role === 'admin' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(createPageUrl("EditCatalogProduct") + `?id=${product.id}`);
              }}
              onMouseDown={(e) => e.stopPropagation()} 
              onTouchStart={(e) => e.stopPropagation()}
              className="min-h-[40px] min-w-[40px] h-9 px-2 gap-1 shadow-md bg-gray-700/40 hover:bg-gray-600/60 text-white rounded-lg transition-all duration-300 flex items-center justify-center backdrop-blur-sm cursor-pointer active:scale-95 border border-gray-600/30"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Indicadores de imagem - EMBAIXO */}
        {hasMultipleImages && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, idx) => (
              <div key={idx} className={`rounded-full transition-all ${idx === currentImageIndex ? 'w-2 h-2 bg-white' : 'w-1.5 h-1.5 bg-white/60'}`} />
            ))}
          </div>
        )}
      </div>
      
      <CardContent className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-white text-sm line-clamp-2 mb-3">
          {product.description}
        </h3>

        <div className="mb-4">
          <p className="text-gray-400 text-xs mb-1">Preço</p>
          <p className="text-2xl font-black text-green-400">
            R$ {product.price_catalog?.toFixed(2) || "0.00"}
          </p>
          {product.quantity && (
            <p className="text-xs text-gray-400 mt-2">Estoque: {product.quantity}</p>
          )}
        </div>

        <div className="space-y-2 mt-auto">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              navigate(createPageUrl("CatalogProductDetails") + `?id=${product.id}`);
            }}
            variant="outline"
            className="w-full bg-white border-gray-300 text-gray-900 font-semibold hover:bg-blue-900 hover:text-white hover:border-blue-900"
          >
            <Info className="w-4 h-4 mr-2" />
            Mais Informações
          </Button>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              setShowComparai(true);
            }}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold"
          >
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/d36767bcd_image.png"
              alt="Comparai"
              className="w-4 h-4 mr-2"
            />
            Comparar Preços
          </Button>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              navigate(createPageUrl("CatalogProductDetails") + `?id=${product.id}`);
            }}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold"
          >
            ✅ Entrar e Comprar
          </Button>


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