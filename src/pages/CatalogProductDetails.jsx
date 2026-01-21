import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, ChevronLeft, ChevronRight, Loader2, ShoppingCart, Minus, Plus, MessageCircle, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import ComparaiButton from "../components/comparai/ComparaiButton";
import { createPageUrl } from "@/utils";

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

  const handleShare = async () => {
    if (!product) return;

    const productUrl = getCanonicalProductUrl();
    const shareText = `🛍️ CATÁLOGO NOZAP!\n\n📱 ${product.description}\n💰 R$ ${product.price_catalog?.toFixed(2)}\n\n🛒 Compre agora: ${productUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Produto: ${product.description}`,
          text: shareText,
          url: productUrl
        });
      } catch (e) {
        if (e.name !== "AbortError") {
          window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
        }
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    }
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
            Voltar ao Catálogo
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

  const handleWhatsApp = () => {
    const productUrl = getCanonicalProductUrl();
    const message = `Olá! Tenho interesse no produto:\n\n📦 ${product.description}\n💰 R$ ${product.price_catalog?.toFixed(2)}\n\n${productUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const normalizeToWaNumber = (phone) => {
    const digits = (phone || '').replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('55')) return digits; // já no formato internacional BR
    return `55${digits}`; // assume Brasil
  };

  const handleWhatsAppToLicensee = () => {
    const productUrl = getCanonicalProductUrl();
    const message = `Olá! Tenho interesse neste produto do Catálogo:\n\n📦 ${product.description}\n💰 R$ ${product.price_catalog?.toFixed(2)}\n🔗 ${productUrl}`;
    const number = normalizeToWaNumber(licenseePhone);
    if (number) {
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      // fallback genérico caso não exista telefone do licenciado
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
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
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentImageIndex ? 'border-green-500' : 'border-gray-600 hover:border-gray-400'
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
              R${product.price_catalog?.toFixed(2) || "0.00"}
            </div>

            {/* QUANTIDADE E ADICIONAR */}
            <div className="grid grid-cols-[auto,1fr] gap-4 items-center">
              {/* Controle de quantidade (coluna 1) */}
              <div className="flex items-center border border-gray-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-gray-800 transition-colors"
                >
                  <Minus className="w-4 h-4 text-white" />
                </button>
                <span className="px-4 py-2 text-white font-medium min-w-[50px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(product.quantity || 99, quantity + 1))}
                  className="p-3 hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Botão Adicionar ao Pedido (coluna 2) */}
              {(product.quantity === 0 || product.quantity === null || product.quantity === undefined) ? (
                <Button
                  disabled
                  className="h-12 bg-yellow-600 hover:bg-yellow-600 text-white font-bold text-base rounded-lg cursor-not-allowed opacity-90"
                >
                  ESGOTADO
                </Button>
              ) : (
                <Button
                  onClick={handleAddToCart}
                  className="h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-base rounded-lg"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  ADICIONAR AO PEDIDO
                </Button>
              )}

              {/* Botão WhatsApp na linha de baixo, alinhado à direita (mesma largura do botão acima) */}
              <div className="col-start-2 w-full">
                <Button
                  onClick={handleWhatsAppToLicensee}
                  variant="outline"
                  className="h-12 w-full border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-500/10 rounded-full font-semibold bg-transparent shadow-[inset_0_0_12px_rgba(16,185,129,0.4)] hover:shadow-[inset_0_0_18px_rgba(16,185,129,0.6)] transition-shadow duration-300"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  PEDIR PELO WHATSAPP
                </Button>
              </div>
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
              <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                <p>{product.description}</p>
                {product.notes && (
                  <p className="text-gray-400">{product.notes}</p>
                )}
              </div>
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