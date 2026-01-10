import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Eye, Filter, Search, ShoppingCart, Loader2, Star, TrendingUp, Zap, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const Product = base44.entities.Product;

export default function Catalog() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [licenseeCode, setLicenseeCode] = useState("");
  const [priceRange, setPriceRange] = useState([0, 50000]);

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
    // Captura código do licenciado da URL
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

  const handleBuyNow = (product) => {
    sessionStorage.setItem('selectedProduct', JSON.stringify(product));
    if (licenseeCode) {
      sessionStorage.setItem('licenseeCode', licenseeCode);
    }
    navigate(createPageUrl("CatalogCheckout") + `?product_id=${product.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="bg-white text-gray-900 min-h-screen">
      {/* HERO BANNER */}
      <div className="relative h-64 md:h-80 bg-gradient-to-r from-green-600 to-blue-600 overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}></div>
        <div className="relative h-full flex items-center justify-center text-center px-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 drop-shadow-lg">
              OFERTAS ESPECIAIS
            </h1>
            <p className="text-lg text-white/90 drop-shadow-md">
              Produtos exclusivos com preços incríveis!
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* FILTROS */}
        <div className="bg-gray-100 rounded-xl p-6 mb-8 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-2 block uppercase">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Nome do produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-gray-300 text-gray-900 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-2 block uppercase">Preço Mín</label>
              <Input
                type="number"
                value={priceRange[0]}
                onChange={(e) => setPriceRange([parseFloat(e.target.value) || 0, priceRange[1]])}
                className="bg-white border-gray-300 text-gray-900 rounded-lg"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-2 block uppercase">Preço Máx</label>
              <Input
                type="number"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseFloat(e.target.value) || 50000])}
                className="bg-white border-gray-300 text-gray-900 rounded-lg"
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
            <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <Zap className="w-6 h-6 text-orange-500" />
              Destaques da Semana
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all border border-gray-200 group">
                  {/* Imagem */}
                  <div className="relative h-56 bg-gray-200 overflow-hidden">
                    {product.image_urls?.[0] ? (
                      <img
                        src={product.image_urls[0]}
                        alt={product.description}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                        <ShoppingCart className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <Badge className="absolute top-3 right-3 bg-orange-500 text-white border-0">
                      <Tag className="w-3 h-3 mr-1" />
                      OFERTA
                    </Badge>
                  </div>

                  {/* Conteúdo */}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 line-clamp-2 mb-3 text-sm">
                      {product.description}
                    </h3>

                    <div className="mb-4">
                      <span className="text-3xl font-black text-green-600">
                        R$ {product.price_catalog?.toFixed(2) || "0.00"}
                      </span>
                      {product.quantity && (
                        <p className="text-xs text-gray-500 mt-1">Estoque: {product.quantity}</p>
                      )}
                    </div>

                    <Button
                      onClick={() => navigate(createPageUrl("CatalogProductDetails") + `?id=${product.id}`)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg"
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TODOS OS PRODUTOS */}
        {regularProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Todos os Produtos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {regularProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all border border-gray-200 group">
                  <div className="relative h-48 bg-gray-200 overflow-hidden">
                    {product.image_urls?.[0] ? (
                      <img
                        src={product.image_urls[0]}
                        alt={product.description}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                        <ShoppingCart className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 line-clamp-2 mb-3 text-sm">
                      {product.description}
                    </h3>

                    <div className="mb-4">
                      <span className="text-2xl font-black text-green-600">
                        R$ {product.price_catalog?.toFixed(2) || "0.00"}
                      </span>
                      {product.quantity && (
                        <p className="text-xs text-gray-500 mt-1">Estoque: {product.quantity}</p>
                      )}
                    </div>

                    <Button
                      onClick={() => handleBuyNow(product)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg"
                    >
                      Comprar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NENHUM PRODUTO */}
        {filteredProducts.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <ShoppingCart className="w-20 h-20 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-600 mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-500">Tente ajustar os filtros de busca</p>
          </div>
        )}
      </div>
    </div>
  );
}