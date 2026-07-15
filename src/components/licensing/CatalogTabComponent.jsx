import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Package } from 'lucide-react';
import CatalogProductCard from '../catalog/CatalogProductCard';
import RotatingBanner from '../banner/RotatingBanner';
import StoreShareLinkCard from './StoreShareLinkCard';

const Product = base44.entities.Product;

export default function CatalogTabComponent({ isSaiDeBaixo, user }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [banners, setBanners] = useState([]);

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

  useEffect(() => {
    base44.entities.BannerImage.filter({ is_active: true, context: 'catalog' })
      .then((bannerData) => {
        const sortedBanners = bannerData.sort((a, b) => a.order - b.order);
        setBanners(sortedBanners);
      })
      .catch(() => {});
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter((p) => p.description?.toLowerCase().includes(term));
  }, [products, searchTerm]);

  return (
    <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
      <CardHeader>
        <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>Loja Virtual de Produtos</CardTitle>
        <CardDescription className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
          Produtos disponíveis para venda - Compartilhe seu link da loja virtual
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {user?.referral_code && (
          <StoreShareLinkCard
            storeLink={`https://leilaonozap.net/Catalog?ref=${user.referral_code}`}
            isSaiDeBaixo={isSaiDeBaixo}
          />
        )}
        {banners.length > 0 && (
          <div className="-mt-2">
            <RotatingBanner banners={banners} fit="contain" heightClass="h-56 md:h-72 lg:h-80" />
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={isSaiDeBaixo ? 'pl-10 bg-gray-100 border-gray-300 text-gray-900' : 'pl-10 bg-gray-700 border-gray-600 text-white'}
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