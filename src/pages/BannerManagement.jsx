import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2, Upload, GripVertical, Eye, Monitor, Smartphone, Sparkles, Palette, Star, FileText, DollarSign, CheckCircle, Ruler, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ImageCropEditor from '../components/admin/ImageCropEditor';
import { convertToWebP } from '@/lib/convertToWebP';

export default function BannerManagement() {
  const [banners, setBanners] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [footerSettings, setFooterSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('banners');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState({ current: 0, total: 0, statusText: '' });

  const loadBanners = async () => {
    try {
      const data = await base44.entities.BannerImage.filter({ context: 'home' }, 'order');
      setBanners(data || []);
    } catch (error) {
      console.error('Erro ao carregar banners:', error);
      toast.error('Erro ao carregar banners');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFeaturedProducts = async () => {
    try {
      const data = await base44.entities.FeaturedProduct.list('order');
      setFeaturedProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    }
  };

  useEffect(() => {
    loadBanners();
    loadFeaturedProducts();
  }, []);

  const handleUploadImage = async (file) => {
    if (!file) return null;
    
    // Verifica se é uma imagem
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, envie apenas imagens');
      return null;
    }
    
    try {
      // Converte para WebP antes do upload (reduz ~25-35% sem perda visível)
      const webpFile = await convertToWebP(file, 0.90);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: webpFile });
      return file_url;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da imagem');
      return null;
    }
  };

  const handleCreateBanner = async (formData) => {
    try {
      await base44.entities.BannerImage.create({
        ...formData,
        context: 'home',
        order: banners.length
      });
      toast.success('Banner criado com sucesso!');
      loadBanners();
      setEditingBanner(null);
    } catch (error) {
      console.error('Erro ao criar banner:', error);
      toast.error('Erro ao criar banner');
    }
  };

  const handleUpdateBanner = async (id, formData) => {
    try {
      await base44.entities.BannerImage.update(id, formData);
      toast.success('Banner atualizado com sucesso!');
      loadBanners();
      setEditingBanner(null);
    } catch (error) {
      console.error('Erro ao atualizar banner:', error);
      toast.error('Erro ao atualizar banner');
    }
  };

  const handleDeleteBanner = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este banner?')) return;
    
    try {
      await base44.entities.BannerImage.delete(id);
      toast.success('Banner excluído com sucesso!');
      loadBanners();
    } catch (error) {
      console.error('Erro ao excluir banner:', error);
      toast.error('Erro ao excluir banner');
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      await base44.entities.BannerImage.update(banner.id, {
        is_active: !banner.is_active
      });
      loadBanners();
      toast.success(banner.is_active ? 'Banner desativado' : 'Banner ativado');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleCreateProduct = async (formData) => {
    try {
      await base44.entities.FeaturedProduct.create({
        ...formData,
        order: featuredProducts.length
      });
      toast.success('Produto criado com sucesso!');
      loadFeaturedProducts();
      setEditingProduct(null);
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      toast.error('Erro ao criar produto');
    }
  };

  const handleUpdateProduct = async (id, formData) => {
    try {
      await base44.entities.FeaturedProduct.update(id, formData);
      toast.success('Produto atualizado com sucesso!');
      loadFeaturedProducts();
      setEditingProduct(null);
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast.error('Erro ao atualizar produto');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
      await base44.entities.FeaturedProduct.delete(id);
      toast.success('Produto excluído com sucesso!');
      loadFeaturedProducts();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  const handleToggleProductActive = async (product) => {
    try {
      await base44.entities.FeaturedProduct.update(product.id, {
        is_active: !product.is_active
      });
      loadFeaturedProducts();
      toast.success(product.is_active ? 'Produto desativado' : 'Produto ativado');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleOptimizeOldImages = async () => {
    setIsOptimizing(true);
    setOptimizationProgress({ current: 0, total: 0, statusText: 'Iniciando extração do banco de dados...' });

    // Função utilitária para carregar de forma segura sem quebrar o resto
    const safeData = async (fetcherFunc, name) => {
      try {
         const data = await fetcherFunc();
         return data || [];
      } catch (error) {
         console.warn(`Erro ao carregar os itens de ${name}:`, error);
         return [];
      }
    };

    try {
      // Definimos as fontes de dados
      const sourcesDef = [
        { name: 'Banners Home', fetcher: () => base44.entities.BannerImage.list(), updateApi: (id, data) => base44.entities.BannerImage.update(id, data), fields: ['image_url'] },
        { name: 'Produtos em Destaque', fetcher: () => base44.entities.FeaturedProduct.list(), updateApi: (id, data) => base44.entities.FeaturedProduct.update(id, data), fields: ['image_url'] },
        { name: 'Banners Luxury', fetcher: () => base44.entities.BannerImage.filter({ context: 'luxurycollection' }), updateApi: (id, data) => base44.entities.BannerImage.update(id, data), fields: ['image_url'] },
        { name: 'Produtos do Catálogo', fetcher: () => base44.entities.CatalogProduct.list(), updateApi: (id, data) => base44.entities.CatalogProduct.update(id, data), fields: ['image_url'] },
        { name: 'Leilões (Produtos)', fetcher: () => base44.entities.Auction.list(), updateApi: (id, data) => base44.entities.Auction.update(id, data), fields: ['cover_url', 'image_url', 'image_urls'] },
        { name: 'Lojistas (Logos)', fetcher: () => base44.entities.Store ? base44.entities.Store.list() : Promise.resolve([]), updateApi: (id, data) => base44.entities.Store.update(id, data), fields: ['logo_url'] },
      ];

      const sources = [];
      for (let i = 0; i < sourcesDef.length; i++) {
        const def = sourcesDef[i];
        setOptimizationProgress({ current: i, total: sourcesDef.length, statusText: `Coletando tabela: ${def.name}...` });
        
        const data = await safeData(def.fetcher, def.name);
        sources.push({ ...def, data });
      }

      setOptimizationProgress({ current: 0, total: 0, statusText: 'Analisando arquivos que precisam de conversão...' });

      // Reunir tudo que precisa ser otimizado
      let allItemsToOptimize = [];
      
      for (const source of sources) {
        if (!source.data || !Array.isArray(source.data)) continue;
        source.data.forEach(item => {
            source.fields.forEach(field => {
              const urlOrArray = item[field];
              
              try {
                if (Array.isArray(urlOrArray)) {
                  urlOrArray.forEach((url, idx) => {
                    if (url && typeof url === 'string' && url.trim().startsWith('http')) {
                      const parsedUrl = new URL(url);
                      const pathLower = parsedUrl.pathname.toLowerCase();
                      if (!pathLower.endsWith('.webp') && !pathLower.endsWith('.svg') && !pathLower.endsWith('.mp4')) {
                        allItemsToOptimize.push({ item, sourceName: source.name, field, url, isArray: true, arrayIndex: idx, updateApi: source.updateApi });
                      }
                    }
                  });
                } else if (urlOrArray && typeof urlOrArray === 'string' && urlOrArray.trim().startsWith('http')) {
                    const parsedUrl = new URL(urlOrArray);
                    const pathLower = parsedUrl.pathname.toLowerCase();
                    if (!pathLower.endsWith('.webp') && !pathLower.endsWith('.svg') && !pathLower.endsWith('.mp4')) {
                      allItemsToOptimize.push({ item, sourceName: source.name, field, url: urlOrArray, isArray: false, updateApi: source.updateApi });
                    }
                }
              } catch (err) {
                // Ignore malformed URLs
              }
            });
        });
      }

      if (allItemsToOptimize.length === 0) {
        setOptimizationProgress({ current: 100, total: 100, statusText: 'Sistema 100% Otimizado! Nenhuma imagem JPG/PNG encontrada.' });
        toast.success("Todas as imagens do sistema já estão no formato WebP!");
        setTimeout(() => {
          setIsOptimizing(false);
          setOptimizationProgress({ current: 0, total: 0, statusText: '' });
        }, 4000);
        return;
      }

      let count = 0;
      for (let i = 0; i < allItemsToOptimize.length; i++) {
        const { item, sourceName, field, url, isArray, arrayIndex, updateApi } = allItemsToOptimize[i];
        
        setOptimizationProgress({ 
          current: i + 1, 
          total: allItemsToOptimize.length, 
          statusText: `Otimizando ${sourceName}: Item ${i+1} de ${allItemsToOptimize.length}...` 
        });
        
        try {
          const parsedCheckUrl = new URL(url);
          const pathLowerCheck = parsedCheckUrl.pathname.toLowerCase();

          if (!pathLowerCheck.endsWith('.webp')) {
            const res = await fetch(url);
            const blob = await res.blob();
            // Pula se for vídeo, json ou já for de fato um WebP no Content-Type
            if (!blob.type.startsWith('image/') || blob.type === 'image/webp' || blob.type.includes('svg')) continue;
            
            const file = new File([blob], `img_${item.id}.png`, { type: blob.type });
            // Força a conversão para WebP passando o 4º parâmetro (force = true)
            const webpFile = await convertToWebP(file, 0.90, 1920, true);
            
            // Força a conversão e upload de qualquer imagem que não seja WebP, a pedido do usuário
            const { file_url } = await base44.integrations.Core.UploadFile({ file: webpFile });
            
            if (isArray) {
              const newArray = [...item[field]];
              newArray[arrayIndex] = file_url;
              item[field] = newArray;
              await updateApi(item.id, { [field]: newArray });
            } else {
              item[field] = file_url;
              await updateApi(item.id, { [field]: file_url });
            }
            count++;
          }
        } catch (e) {
          console.error("Erro ao otimizar imagem:", item.id, e);
        }
      }

      setOptimizationProgress({ 
        current: allItemsToOptimize.length, 
        total: allItemsToOptimize.length, 
        statusText: `Concluído! ${count} imagens foram convertidas para WebP.` 
      });
      toast.success(`Otimização global concluída com sucesso!`);
      loadBanners();
      loadFeaturedProducts();

      setTimeout(() => {
        setIsOptimizing(false);
        setOptimizationProgress({ current: 0, total: 0, statusText: '' });
      }, 4000);
    } catch (error) {
      console.error('Erro na otimização:', error);
      toast.error('O sistema detectou um erro ou negação de permissão ao varrer tabelas.');
      setOptimizationProgress({ current: 100, total: 100, statusText: 'Erro de conexão ou permissão ao buscar os dados.' });
      
      setTimeout(() => {
         setIsOptimizing(false);
         setOptimizationProgress({ current: 0, total: 0, statusText: '' });
      }, 5000);
    }
  };

  const handleBannerDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(banners);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setBanners(items);

    try {
      await Promise.all(
        items.map((item, index) =>
          base44.entities.BannerImage.update(item.id, { order: index })
        )
      );
      toast.success('Ordem atualizada!');
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error);
      toast.error('Erro ao atualizar ordem');
      loadBanners();
    }
  };

  const handleProductDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(featuredProducts);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFeaturedProducts(items);

    try {
      await Promise.all(
        items.map((item, index) =>
          base44.entities.FeaturedProduct.update(item.id, { order: index })
        )
      );
      toast.success('Ordem atualizada!');
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error);
      toast.error('Erro ao atualizar ordem');
      loadFeaturedProducts();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Gerenciamento de Conteúdo</h1>
          <Button
            onClick={handleOptimizeOldImages}
            disabled={isOptimizing}
            className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-900/40"
          >
            {isOptimizing ? (
              'Carregando Otimização...'
            ) : (
              <span className="inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Converter Todas as Imagens do Sistema (WebP)
              </span>
            )}
          </Button>
        </div>

        {/* Barra de Progresso Visível */}
        {isOptimizing && (
          <div className="mb-6 bg-gray-800 rounded-lg p-4 border border-purple-500/30 w-full animate-pulse transition-all">
            <div className="flex justify-between text-sm text-gray-300 font-semibold mb-2">
              <span>{optimizationProgress.statusText}</span>
              <span>
                {optimizationProgress.total > 0 
                  ? Math.round((optimizationProgress.current / optimizationProgress.total) * 100) 
                  : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-purple-500 to-green-500 h-3 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                style={{ 
                  width: `${optimizationProgress.total > 0 ? (optimizationProgress.current / optimizationProgress.total) * 100 : 5}%` 
                }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <Button
            onClick={() => setActiveTab('banners')}
            variant={activeTab === 'banners' ? 'default' : 'outline'}
            className={activeTab === 'banners' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <Palette className="w-4 h-4 mr-2" />Banners
          </Button>
          <Button
            onClick={() => setActiveTab('products')}
            variant={activeTab === 'products' ? 'default' : 'outline'}
            className={activeTab === 'products' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <Star className="w-4 h-4 mr-2" />Produtos em Destaque
          </Button>
          <Button
            onClick={() => setActiveTab('footer')}
            variant={activeTab === 'footer' ? 'default' : 'outline'}
            className={activeTab === 'footer' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <FileText className="w-4 h-4 mr-2" />Rodapé
          </Button>
        </div>

        {activeTab === 'banners' && (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white">Gerenciar Banners</h2>
          <div className="flex gap-2">
            <Button
              onClick={() => setEditingBanner({ image_url: '', title: '', link_url: '', is_active: true, device_type: 'desktop' })}
              className="bg-green-600 hover:bg-green-700"
            >
              <Monitor className="w-4 h-4 mr-2" />
              Novo Banner Desktop
            </Button>
            <Button
              onClick={() => setEditingBanner({ image_url: '', title: '', link_url: '', is_active: true, device_type: 'mobile' })}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Novo Banner Mobile
            </Button>
          </div>
        </div>

        {/* Preview dos Banners Ativos */}
        {banners.filter(b => b.is_active).length > 0 && (
          <Card className="bg-gray-800 border-gray-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Preview dos Banners Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {banners.filter(b => b.is_active).map((banner) => (
                  <div key={banner.id} className="relative group">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <p className="text-white text-sm font-semibold">{banner.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Banners */}
        <DragDropContext onDragEnd={handleBannerDragEnd}>
          <Droppable droppableId="banners">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="space-y-4"
              >
                {banners.map((banner, index) => (
                  <Draggable key={banner.id} draggableId={banner.id} index={index}>
                    {(provided) => (
                      <Card 
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="bg-gray-800 border-gray-700"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="w-5 h-5 text-gray-500 cursor-grab active:cursor-grabbing" />
                            </div>
                  
                            <img
                              src={banner.image_url}
                              alt={banner.title}
                              className="w-32 h-20 object-cover rounded-lg"
                            />

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-white font-semibold">{banner.title || 'Sem título'}</h3>
                                {banner.device_type === 'mobile' ? (
                                  <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full flex items-center gap-1">
                                    <Smartphone className="w-3 h-3" />
                                    Mobile
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full flex items-center gap-1">
                                    <Monitor className="w-3 h-3" />
                                    Desktop
                                  </span>
                                )}
                              </div>
                              {banner.link_url && (
                                <p className="text-gray-400 text-sm truncate">{banner.link_url}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`active-${banner.id}`} className="text-gray-300 text-sm">
                                  {banner.is_active ? 'Ativo' : 'Inativo'}
                                </Label>
                                <Switch
                                  id={`active-${banner.id}`}
                                  checked={banner.is_active}
                                  onCheckedChange={() => handleToggleActive(banner)}
                                />
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingBanner(banner)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                Editar
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteBanner(banner.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                  ))}
                  {provided.placeholder}
                  </div>
                  )}
                  </Droppable>
                  </DragDropContext>

        {/* Formulário de Edição/Criação */}
        {editingBanner && (
          <BannerForm
            banner={editingBanner}
            onSave={(formData) => {
              if (editingBanner.id) {
                handleUpdateBanner(editingBanner.id, formData);
              } else {
                handleCreateBanner(formData);
              }
            }}
            onCancel={() => setEditingBanner(null)}
            onUploadImage={handleUploadImage}
          />
        )}
          </>
        )}

        {activeTab === 'products' && (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white">Produtos em Destaque - Página Parceiros</h2>
              <Button
                onClick={() => setEditingProduct({ 
                  name: '', 
                  category: '', 
                  investment: '', 
                  expected_return: '', 
                  image_url: '', 
                  is_active: true 
                })}
                className="bg-green-600 hover:bg-green-700"
              >
                + Novo Produto
              </Button>
            </div>

            {/* Preview dos Produtos */}
            {featuredProducts.filter(p => p.is_active).length > 0 && (
              <Card className="bg-gray-800 border-gray-700 mb-8">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Preview dos Produtos Ativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {featuredProducts.filter(p => p.is_active).map((product) => (
                      <div key={product.id} className="bg-gray-900 rounded-lg overflow-hidden">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-40 object-cover"
                        />
                        <div className="p-3">
                          <div className="text-xs text-green-400 mb-1">{product.category}</div>
                          <h4 className="text-white font-bold mb-2">{product.name}</h4>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400 inline-flex items-center gap-1"><DollarSign className="w-3 h-3" />{product.investment}</span>
                            <span className="text-green-400 inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" />{product.expected_return}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de Produtos */}
            <DragDropContext onDragEnd={handleProductDragEnd}>
              <Droppable droppableId="products">
                {(provided) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    {featuredProducts.map((product, index) => (
                      <Draggable key={product.id} draggableId={product.id} index={index}>
                        {(provided) => (
                          <Card 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="bg-gray-800 border-gray-700"
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="w-5 h-5 text-gray-500 cursor-grab active:cursor-grabbing" />
                                </div>
                      
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-32 h-20 object-cover rounded-lg"
                                />

                                <div className="flex-1">
                                  <h3 className="text-white font-semibold">{product.name}</h3>
                                  <p className="text-gray-400 text-sm">{product.category}</p>
                                  <div className="flex gap-4 mt-1">
                                    <span className="text-xs text-gray-500 inline-flex items-center gap-1"><DollarSign className="w-3 h-3" />{product.investment}</span>
                                    <span className="text-xs text-green-400 inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" />{product.expected_return}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <Label htmlFor={`product-active-${product.id}`} className="text-gray-300 text-sm">
                                      {product.is_active ? 'Ativo' : 'Inativo'}
                                    </Label>
                                    <Switch
                                      id={`product-active-${product.id}`}
                                      checked={product.is_active}
                                      onCheckedChange={() => handleToggleProductActive(product)}
                                    />
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingProduct(product)}
                                    className="text-blue-400 hover:text-blue-300"
                                  >
                                    Editar
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteProduct(product.id)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                      ))}
                      {provided.placeholder}
                      </div>
                      )}
                      </Droppable>
                      </DragDropContext>

                      {editingProduct && (
              <ProductForm
                product={editingProduct}
                onSave={(formData) => {
                  if (editingProduct.id) {
                    handleUpdateProduct(editingProduct.id, formData);
                  } else {
                    handleCreateProduct(formData);
                  }
                }}
                onCancel={() => setEditingProduct(null)}
                onUploadImage={handleUploadImage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProductForm({ product, onSave, onCancel, onUploadImage }) {
  const [formData, setFormData] = useState(product);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showCropEditor, setShowCropEditor] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState(null);
  const fileInputRef = React.useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verifica dimensões da imagem
    const img = new Image();
    img.onload = () => {
      // Se não for 1200x600, abre o editor
      if (img.width !== 1200 || img.height !== 600) {
        setPendingImageFile(file);
        setShowCropEditor(true);
      } else {
        // Dimensões perfeitas, faz upload direto
        uploadImageFile(file);
      }
    };
    img.src = URL.createObjectURL(file);
  };

  const uploadImageFile = async (file) => {
    setIsUploading(true);
    const imageUrl = await onUploadImage(file);
    if (imageUrl) {
      setFormData({ ...formData, image_url: imageUrl });
      toast.success('Imagem enviada com sucesso!');
    }
    setIsUploading(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Por favor, envie apenas imagens');
      return;
    }

    // Verifica dimensões da imagem
    const img = new Image();
    img.onload = () => {
      // Se não for 1200x600, abre o editor
      if (img.width !== 1200 || img.height !== 600) {
        setPendingImageFile(file);
        setShowCropEditor(true);
      } else {
        // Dimensões perfeitas, faz upload direto
        uploadImageFile(file);
      }
    };
    img.src = URL.createObjectURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.image_url || !formData.name || !formData.category || !formData.investment || !formData.expected_return) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    onSave(formData);
  };

  return (
    <>
      {showCropEditor && pendingImageFile && (
        <ImageCropEditor
          imageFile={pendingImageFile}
          targetWidth={1200}
          targetHeight={600}
          onSave={(croppedFile) => {
            setShowCropEditor(false);
            setPendingImageFile(null);
            uploadImageFile(croppedFile);
          }}
          onCancel={() => {
            setShowCropEditor(false);
            setPendingImageFile(null);
          }}
        />
      )}

      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <Card className="bg-gray-800 border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <CardTitle className="text-white">
              {product.id ? 'Editar Produto' : 'Novo Produto em Destaque'}
            </CardTitle>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-gray-300">Imagem do Produto *</Label>
              
              {/* Informações sobre dimensões */}
              <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-3 mb-3">
                <p className="text-blue-400 text-sm font-semibold mb-1 flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5" />Dimensões Recomendadas</p>
                <p className="text-gray-300 text-xs leading-relaxed">
                  • <strong>Formato:</strong> Horizontal (paisagem)<br/>
                  • <strong>Dimensões:</strong> 1200 x 600 pixels (proporção 2:1)<br/>
                  • <strong>Tipo:</strong> PNG ou JPG com alta qualidade<br/>
                  • <strong>Peso:</strong> Até 2MB para melhor desempenho
                </p>
              </div>
              
              {/* Área de Drop */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => fileInputRef.current?.click()}
              >
                {formData.image_url ? (
                  <div className="relative">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <p className="text-white font-semibold">Clique ou arraste para trocar</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-8">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-300 font-semibold mb-2">
                      {isUploading ? 'Enviando imagem...' : 'Clique ou arraste uma imagem'}
                    </p>
                    <p className="text-gray-500 text-sm">
                      PNG, JPG ou WebP (qualidade máxima preservada)
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />
            </div>

            <div>
              <Label className="text-gray-300">Nome do Produto *</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: iPhone 13 Pro"
                className="bg-gray-700 text-white border-gray-600"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Categoria *</Label>
              <Input
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Eletrônicos Premium"
                className="bg-gray-700 text-white border-gray-600"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Investimento *</Label>
                <Input
                  value={formData.investment || ''}
                  onChange={(e) => {
                    let value = e.target.value;
                    
                    // Remove tudo exceto números
                    const numbers = value.replace(/\D/g, '');
                    
                    if (numbers) {
                      // Converte para número e formata
                      const numericValue = parseFloat(numbers) / 100;
                      const formatted = numericValue.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      });
                      
                      // Calcula o lucro de 3%
                      const profit = (numericValue * 0.03).toFixed(2);
                      
                      setFormData(prev => ({ 
                        ...prev, 
                        investment: formatted,
                        expected_return: `R$ ${profit}` 
                      }));
                    } else {
                      setFormData(prev => ({ 
                        ...prev, 
                        investment: '',
                        expected_return: '' 
                      }));
                    }
                  }}
                  placeholder="Ex: R$ 8.000,00"
                  className="bg-gray-700 text-white border-gray-600"
                  required
                />
              </div>

              <div>
                <Label className="text-gray-300">Lucro Estimado (3%) *</Label>
                <Input
                  value={formData.expected_return || ''}
                  onChange={(e) => setFormData({ ...formData, expected_return: e.target.value })}
                  placeholder="Calculado automaticamente"
                  className="bg-gray-700 text-white border-gray-600"
                  required
                />
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Lightbulb className="w-3 h-3" />Calculado automaticamente ao digitar o investimento</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                {product.id ? 'Atualizar' : 'Criar'} Produto
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
    </>
  );
}

function BannerForm({ banner, onSave, onCancel, onUploadImage }) {
  const [formData, setFormData] = useState(banner);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const imageUrl = await onUploadImage(file);
    if (imageUrl) {
      setFormData({ ...formData, image_url: imageUrl });
    }
    setIsUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.image_url) {
      toast.error('É necessário fazer upload de uma imagem');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="bg-gray-800 border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-white">
            {banner.id ? 'Editar Banner' : 'Novo Banner'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-gray-300">Imagem do Banner</Label>
              {formData.image_url && (
                <img
                  src={formData.image_url}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg mb-2"
                />
              )}
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="bg-gray-700 text-white border-gray-600"
                />
                <Button type="button" disabled={isUploading} variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'Enviando...' : 'Upload'}
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Tipo de Dispositivo</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.device_type === 'desktop' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, device_type: 'desktop' })}
                  className={formData.device_type === 'desktop' ? 'bg-green-600' : ''}
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  Desktop
                </Button>
                <Button
                  type="button"
                  variant={formData.device_type === 'mobile' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, device_type: 'mobile' })}
                  className={formData.device_type === 'mobile' ? 'bg-blue-600' : ''}
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Mobile
                </Button>
              </div>
              <p className="text-gray-400 text-xs mt-1">
                <span className="inline-flex items-center gap-1.5">
                  <Ruler className="w-3 h-3" />
                  {formData.device_type === 'desktop' ? 'Recomendado: 1920x600px' : 'Recomendado: 800x600px'}
                </span>
              </p>
            </div>

            <div>
              <Label className="text-gray-300">Título/Descrição</Label>
              <Input
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Promoção de Natal"
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>

            <div>
              <Label className="text-gray-300">Link (opcional)</Label>
              <Input
                value={formData.link_url || ''}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                placeholder="https://..."
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                {banner.id ? 'Atualizar' : 'Criar'} Banner
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}