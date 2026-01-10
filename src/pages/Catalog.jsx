import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Filter, Search, ShoppingCart, Loader2, Zap, Tag, ChevronLeft, ChevronRight, Heart, Share2, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import FavoriteButton from "../components/recommendations/FavoriteButton";
import ComparaiFloatingButton from '../components/comparai/ComparaiFloatingButton';

const Product = base44.entities.Product;
const FavoriteProduct = base44.entities.FavoriteProduct || null;

export default function Catalog() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [licenseeCode, setLicenseeCode] = useState("");
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [carouselIndex, setCarouselIndex] = useState({});

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (priceRange) {
      filtered = filtered.filter(p =>
        p.price_catalog >= priceRange[0] && p.price_catalog <= priceRange[1]
      );
    }

    return filtered;
  }, [products, searchTerm, priceRange]);

  const featuredProducts = useMemo(() => {
    return filteredProducts.slice(0, 4);
  }, [filteredProducts]);

  const regularProducts = useMemo(() => {
    return filteredProducts.slice(4);
  }, [filteredProducts]);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (savedUser && isLoggedIn) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      sessionStorage.setItem('licenseeCode', ref);
      setLicenseeCode(ref);
    } else {
      const saved = sessionStorage.getItem('licenseeCode');
      setLicenseeCode(saved || '');
    }
  }, [location]);

  useEffect(() => {
    loadCatalogProducts();
  }, []);

  const loadCatalogProducts = async () => {
    setIsLoading(true);
    try {
      const allProducts = await Product.filter({ catalog_active: true }, "-created_date", 100);
      // Garante que image_urls seja sempre um array
      const productsWithImages = (Array.isArray(allProducts) ? allProducts : []).map(p => ({
        ...p,
        image_urls: Array.isArray(p.image_urls) ? p.image_urls : (p.image_urls ? [p.image_urls] : [])
      }));
      setProducts(productsWithImages);
    } catch (error) {
      console.error("Erro ao carregar catálogo:", error);
      toast.error("Erro ao carregar produtos");
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (product) => {
    const productUrl = window.location.href + `?product_id=${product.id}`;
    const shareText = `🛍️ CATÁLOGO NOZAP!\n\n📱 ${product.description}\n💰 R$ ${product.price_catalog?.toFixed(2)}\n\n🛒 Compre agora!`;

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

  const handleNextImage = (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product?.image_urls || product.image_urls.length === 0) return;
    setCarouselIndex(prev => ({
      ...prev,
      [productId]: ((prev[productId] || 0) + 1) % product.image_urls.length
    }));
  };

  const handlePrevImage = (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product?.image_urls || product.image_urls.length === 0) return;
    setCarouselIndex(prev => ({
      ...prev,
      [productId]: ((prev[productId] || 0) - 1 + product.image_urls.length) % product.image_urls.length
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* HERO BANNER - COMO HOME.JS */}
      <div className="relative overflow-hidden bg-gray-900 rounded-2xl p-6 text-white m-6 mt-4">
        <div className="absolute -top-10 -right-10 w-72 h-72 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="relative">
          <h1 className="text-3xl lg:text-4xl font-bold mb-3 tracking-tight flex items-center gap-3">
            <Flame className="w-9 h-9 text-orange-400" />
            <span>Catálogo <span className="text-green-400">Especial</span>!</span>
          </h1>
          <p className="text-gray-300 mb-4 text-base lg:text-lg">
            {products.length} produtos incríveis com preços imbatíveis. Compre e economize!
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
         {/* FILTROS */}
         <div className="bg-gray-800/50 rounded-xl p-6 mb-8 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-300 mb-2 block uppercase">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Nome do produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 mb-2 block uppercase">Preço Mín</label>
              <Input
                type="number"
                value={priceRange[0]}
                onChange={(e) => setPriceRange([parseFloat(e.target.value) || 0, priceRange[1]])}
                className="bg-gray-700 border-gray-600 text-white rounded-lg"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 mb-2 block uppercase">Preço Máx</label>
              <Input
                type="number"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseFloat(e.target.value) || 50000])}
                className="bg-gray-700 border-gray-600 text-white rounded-lg"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={loadCatalogProducts}
                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
            </div>
          </div>
        </div>

        {/* PRODUTOS EM DESTAQUE */}
         {featuredProducts.length > 0 && (
           <div className="mb-12">
             <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
               <Zap className="w-6 h-6 text-orange-500" />
               Destaques da Semana
             </h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
               {featuredProducts.map((product) => {
                 const currentIdx = carouselIndex[product.id] || 0;
                 const currentImage = product.image_urls?.[currentIdx];
                 const hasMultipleImages = product.image_urls && product.image_urls.length > 1;

                 return (
                   <div key={product.id} className="bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-gray-700 group flex flex-col">
                     {/* Imagem com Carrossel */}
                     <div className="relative h-56 bg-gray-700 overflow-hidden">
                       {currentImage ? (
                         <img
                           src={currentImage}
                           alt={product.description}
                           className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                         />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                           <ShoppingCart className="w-12 h-12 text-gray-600" />
                         </div>
                       )}
                       <Badge className="absolute top-3 right-3 bg-orange-500 text-white border-0">
                         <Tag className="w-3 h-3 mr-1" />
                         OFERTA
                       </Badge>

                       {/* Navegação Carrossel */}
                       {hasMultipleImages && (
                         <>
                           <button
                             onClick={() => handlePrevImage(product.id)}
                             className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-1 rounded-full z-10"
                           >
                             <ChevronLeft className="w-5 h-5 text-white" />
                           </button>
                           <button
                             onClick={() => handleNextImage(product.id)}
                             className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-1 rounded-full z-10"
                           >
                             <ChevronRight className="w-5 h-5 text-white" />
                           </button>
                         </>
                       )}
                     </div>

                     {/* Conteúdo */}
                     <div className="p-4 flex-1 flex flex-col">
                       <h3 className="font-bold text-white line-clamp-2 mb-3 text-sm">
                         {product.description}
                       </h3>

                       <div className="mb-4">
                         <span className="text-3xl font-black text-green-400">
                           R$ {product.price_catalog?.toFixed(2) || "0.00"}
                         </span>
                         {product.quantity && (
                           <p className="text-xs text-gray-400 mt-1">Estoque: {product.quantity}</p>
                         )}
                       </div>

                       {/* Botões */}
                       <div className="space-y-2 mt-auto">
                         <Button
                           onClick={() => navigate(createPageUrl("CatalogProductDetails") + `?id=${product.id}`)}
                           className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg"
                         >
                           ✅ Entrar e Comprar
                         </Button>
                         <div className="flex gap-2">
                           {currentUser && (
                             <FavoriteButton
                               auctionId={product.id}
                               userId={currentUser.id}
                               size="sm"
                               className="flex-1"
                             />
                           )}
                           <button
                             onClick={() => handleShare(product)}
                             className="flex-1 bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-all flex items-center justify-center gap-1"
                           >
                             <Share2 className="w-4 h-4" />
                             <span className="text-xs">Compartilhar</span>
                           </button>
                         </div>
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
           </div>
         )}

        {/* TODOS OS PRODUTOS */}
         {regularProducts.length > 0 && (
           <div>
             <h2 className="text-2xl font-black text-white mb-6">Todos os Produtos</h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
               {regularProducts.map((product) => {
                 const currentIdx = carouselIndex[product.id] || 0;
                 const currentImage = product.image_urls?.[currentIdx];
                 const hasMultipleImages = product.image_urls && product.image_urls.length > 1;

                 return (
                   <div key={product.id} className="bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-gray-700 group flex flex-col">
                     <div className="relative h-48 bg-gray-700 overflow-hidden">
                       {currentImage ? (
                         <img
                           src={currentImage}
                           alt={product.description}
                           className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                           onClick={() => navigate(createPageUrl("CatalogProductDetails") + `?id=${product.id}`)}
                         />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                           <ShoppingCart className="w-12 h-12 text-gray-600" />
                         </div>
                       )}

                       {hasMultipleImages && (
                         <>
                           <button
                             onClick={(e) => { e.stopPropagation(); handlePrevImage(product.id); }}
                             className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-1 rounded-full z-10"
                           >
                             <ChevronLeft className="w-4 h-4 text-white" />
                           </button>
                           <button
                             onClick={(e) => { e.stopPropagation(); handleNextImage(product.id); }}
                             className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-1 rounded-full z-10"
                           >
                             <ChevronRight className="w-4 h-4 text-white" />
                           </button>
                         </>
                       )}
                     </div>

                     <div className="p-4 flex-1 flex flex-col">
                       <h3 className="font-bold text-white line-clamp-2 mb-3 text-sm cursor-pointer" onClick={() => navigate(createPageUrl("CatalogProductDetails") + `?id=${product.id}`)}>
                         {product.description}
                       </h3>

                       <div className="mb-4">
                         <span className="text-2xl font-black text-green-400">
                           R$ {product.price_catalog?.toFixed(2) || "0.00"}
                         </span>
                         {product.quantity && (
                           <p className="text-xs text-gray-400 mt-1">Estoque: {product.quantity}</p>
                         )}
                       </div>

                       <div className="space-y-2 mt-auto">
                         <Button
                           onClick={() => navigate(createPageUrl("CatalogProductDetails") + `?id=${product.id}`)}
                           className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg"
                         >
                           ✅ Entrar e Comprar
                         </Button>
                         <div className="flex gap-2">
                           {currentUser && (
                             <FavoriteButton
                               auctionId={product.id}
                               userId={currentUser.id}
                               size="sm"
                               className="flex-1"
                             />
                           )}
                           <button
                             onClick={() => handleShare(product)}
                             className="flex-1 bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-all flex items-center justify-center gap-1"
                           >
                             <Share2 className="w-4 h-4" />
                             <span className="text-xs">Compartilhar</span>
                           </button>
                         </div>
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
           </div>
         )}

        {/* NENHUM PRODUTO */}
        {filteredProducts.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <ShoppingCart className="w-20 h-20 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-bold text-gray-300 mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-500">Tente ajustar os filtros de busca</p>
          </div>
        )}
        </div>

        {/* COMPARAI BUTTON FLUTUANTE */}
        <ComparaiFloatingButton auctions={filteredProducts} mode="catalog" />
        </div>
        );
        }