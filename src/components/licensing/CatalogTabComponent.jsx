import React, { useState, useEffect, useMemo } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Package } from 'lucide-react';
import CatalogProductCard from '../catalog/CatalogProductCard';
import RotatingBanner from '../banner/RotatingBanner';
import { CATALOG_BANNERS } from '../loja/LojaShopeeHeader';

const Product = plataforma.entities.Product;

export default function CatalogTabComponent({ isSaiDeBaixo, user }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const catalogProducts = await Product.filter({ catalog_active: true }, '-created_date', 200);
        setProducts(Array.isArray(catalogProducts) ? catalogProducts : []);
      } catch (error) {
        console.error('Erro ao carregar catálogo:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter((p) => p.description?.toLowerCase().includes(term));
  }, [products, searchTerm]);

  return (
    // 🌑 TEMA ESCURO FIXO (08/08/2026 — pedido Gabriel): esta é a MESMA vitrine
    // da Loja Virtual pública, então tem que ter a MESMA cara. É a única aba do
    // painel que fica escura; o resto da Central de Vendas continua branco.
    <Card className="bg-gray-900 border-gray-800 nz-escuro">
      <CardHeader>
        <CardTitle className="text-white">Loja Virtual de Produtos</CardTitle>
        <CardDescription className="text-gray-400">
          Produtos disponíveis para venda
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* FASE 3 — o cartão de "compartilhar sua loja" saiu daqui: o dono
            oficial do link da loja é Admin › Minha Loja. Estava repetido. */}
        <div className="-mt-2">
          <RotatingBanner banners={CATALOG_BANNERS} fit="cover" heightClass="aspect-[1200/630] h-auto" />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-16 h-16 mx-auto opacity-50 mb-4" />
            <p>Nenhum produto disponível</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <CatalogProductCard key={product.id} product={product} currentUser={null} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}