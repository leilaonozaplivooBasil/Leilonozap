import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Eye, Filter, Search, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      setProducts(Array.isArray(allProducts) ? allProducts : []);
    } catch (error) {
      console.error("Erro ao carregar catálogo:", error);
      toast.error("Erro ao carregar produtos");
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

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
    <div className="bg-gray-900 text-white min-h-screen py-6">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">📦 Catálogo de Produtos</h1>
          <p className="text-gray-400">
            {licenseeCode ? `Comprando através de: ${licenseeCode}` : "Compre direto do catálogo"}
          </p>
        </div>

        {/* Filtros */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Nome do produto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Preço Mín (R$)</label>
                <Input
                  type="number"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([parseFloat(e.target.value), priceRange[1]])}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Preço Máx (R$)</label>
                <Input
                  type="number"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseFloat(e.target.value)])}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={loadCatalogProducts}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Produtos */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-gray-400">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="bg-gray-800 border-gray-700 hover:border-green-500/50 transition-all overflow-hidden group">
                <div className="relative h-48 bg-gray-700 overflow-hidden">
                  {product.image_urls?.[0] ? (
                    <img
                      src={product.image_urls[0]}
                      alt={product.description}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <ShoppingCart className="w-12 h-12" />
                    </div>
                  )}
                </div>

                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-white line-clamp-2 h-14">
                    {product.description}
                  </h3>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Preço Catálogo</span>
                      <span className="text-2xl font-bold text-green-400">
                        R$ {product.price_catalog?.toFixed(2) || "0.00"}
                      </span>
                    </div>

                    {product.quantity && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Estoque</span>
                        <span className="text-gray-400">{product.quantity} un.</span>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => handleBuyNow(product)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Comprar Agora
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}