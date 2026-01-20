import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, X, ChevronLeft, ChevronRight, Loader2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import ComparaiButton from "../components/comparai/ComparaiButton";
import { createPageUrl } from "@/utils";

const Product = base44.entities.Product;
const CartItem = base44.entities.CartItem;

export default function CatalogProductDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const productId = searchParams.get("id");

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);

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

  const [addingToCart, setAddingToCart] = useState(false);

  const handleAddToCart = async () => {
    if (!currentUser) {
      toast.error('Faça login para adicionar ao carrinho');
      navigate(createPageUrl("Register"));
      return;
    }

    setAddingToCart(true);
    try {
      // Verifica se já existe no carrinho
      const existingItems = await CartItem.filter({ 
        user_id: currentUser.id, 
        product_id: product.id 
      });

      if (existingItems && existingItems.length > 0) {
        // Atualiza quantidade
        await CartItem.update(existingItems[0].id, {
          quantity: (existingItems[0].quantity || 1) + 1
        });
        toast.success('Quantidade atualizada no carrinho!');
      } else {
        // Adiciona novo item
        await CartItem.create({
          user_id: currentUser.id,
          product_id: product.id,
          product_title: product.description,
          product_image: product.image_urls?.[0] || '',
          product_price: product.price_catalog || 0,
          quantity: 1
        });
        toast.success('Produto adicionado ao carrinho!');
      }
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
      toast.error('Erro ao adicionar ao carrinho');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleShare = async () => {
    if (!product) return;

    const productUrl = window.location.href;
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

        <h1 className="text-lg font-bold flex-1 text-center px-4 line-clamp-1">
          {product.description}
        </h1>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleShare}
          className="text-green-400 hover:bg-gray-800"
        >
          <Share2 className="w-5 h-5" />
        </Button>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* CARROSSEL DE IMAGENS */}
        <div className="relative bg-gray-800 rounded-2xl overflow-hidden aspect-square md:aspect-video">
          {currentImage ? (
            <img 
              src={currentImage} 
              alt={product.description}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-700">
              <span className="text-gray-400">Sem imagem</span>
            </div>
          )}

          {/* NAVEGAÇÃO DE IMAGENS */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-2 rounded-full transition-all z-10"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-2 rounded-full transition-all z-10"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>

              {/* INDICADORES */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentImageIndex ? 'bg-white w-6' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* INFORMAÇÕES DO PRODUTO */}
        <div className="bg-gray-800/50 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {product.description}
            </h2>
            <p className="text-gray-400 text-sm">
              {images.length > 0 && `${currentImageIndex + 1} de ${images.length} imagens`}
            </p>
          </div>

          {/* PREÇO */}
          <div className="border-t border-gray-700 pt-4">
            <p className="text-gray-400 text-sm mb-1">Preço de Venda</p>
            <p className="text-4xl font-black text-green-400">
              R$ {product.price_catalog?.toFixed(2) || "0.00"}
            </p>
          </div>

          {/* ESTOQUE */}
          {product.quantity && (
            <div className="border-t border-gray-700 pt-4">
              <p className="text-gray-400 text-sm">Estoque Disponível</p>
              <p className="text-xl font-semibold text-white">{product.quantity} unidade(s)</p>
            </div>
          )}

          {/* DESCRIÇÃO ADICIONAL */}
          {product.notes && (
            <div className="border-t border-gray-700 pt-4">
              <p className="text-gray-400 text-sm mb-2">Informações Adicionais</p>
              <p className="text-white text-sm">{product.notes}</p>
            </div>
          )}
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="space-y-3 pb-6">
          <Button
            onClick={handleAddToCart}
            disabled={addingToCart}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-lg"
          >
            {addingToCart ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <ShoppingCart className="w-5 h-5 mr-2" />
            )}
            {addingToCart ? 'Adicionando...' : 'Adicionar ao Carrinho'}
          </Button>

          {/* Comparai será renderizado como floating button */}
        </div>
      </main>

      {/* COMPARAI BUTTON FLUTUANTE */}
      {product && (
        <div className="fixed bottom-4 right-4 z-40">
          {/* Wrapper para compatibilidade com ComparaiButton */}
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