import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2, Upload, GripVertical, Eye, Monitor, Smartphone, Move, Package, Plus, Loader2, Edit, Star } from 'lucide-react';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ImagePositionEditor from '@/components/admin/ImagePositionEditor';

export default function CatalogManagement() {
  const navigate = useNavigate();
  const [catalogBanners, setCatalogBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState(null);
  const [activeTab, setActiveTab] = useState('banners');
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editingFeaturedProduct, setEditingFeaturedProduct] = useState(null);

  const loadBanners = async () => {
    try {
      // Filtrar apenas banners de catálogo (adicione uma nova propriedade 'context' na entidade BannerImage)
      const data = await base44.entities.BannerImage.filter({ context: 'catalog' }, 'order');
      setCatalogBanners(data || []);
    } catch (error) {
      console.error('Erro ao carregar banners:', error);
      toast.error('Erro ao carregar banners');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
    loadProducts();
  }, []);
  
  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await base44.entities.Product.list('-updated_date', 100);
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleUploadImage = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Por favor, envie apenas imagens');
      return null;
    }
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
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
        context: 'catalog',
        order: catalogBanners.length
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

  const handleBannerDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(catalogBanners);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCatalogBanners(items);

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

  const handleToggleFeatured = async (product) => {
    try {
      await base44.entities.Product.update(product.id, {
        is_featured: !product.is_featured
      });
      loadProducts();
      toast.success(product.is_featured ? 'Removido do destaque' : 'Adicionado ao destaque');
    } catch (error) {
      console.error('Erro ao atualizar destaque:', error);
      toast.error('Erro ao atualizar destaque');
    }
  };

  const handleUpdateFeaturedProduct = async (productId, newDescription) => {
    try {
      await base44.entities.Product.update(productId, {
        description: newDescription
      });
      loadProducts();
      setEditingFeaturedProduct(null);
      toast.success('Nome do produto atualizado!');
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast.error('Erro ao atualizar produto');
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
        <h1 className="text-3xl font-bold text-white mb-6">Gerenciamento do Catálogo</h1>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <Button
            onClick={() => setActiveTab('banners')}
            variant={activeTab === 'banners' ? 'default' : 'outline'}
            className={activeTab === 'banners' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            🎨 Banners
          </Button>
          <Button
            onClick={() => setActiveTab('catalog-products')}
            variant={activeTab === 'catalog-products' ? 'default' : 'outline'}
            className={activeTab === 'catalog-products' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            📦 Produtos do Catálogo
          </Button>
          <Button
            onClick={() => setActiveTab('produtos')}
            variant={activeTab === 'produtos' ? 'default' : 'outline'}
            className={activeTab === 'produtos' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
          >
            ⭐ Produtos em Destaque
          </Button>
          <Button
            onClick={() => setActiveTab('rodape')}
            variant={activeTab === 'rodape' ? 'default' : 'outline'}
            className={activeTab === 'rodape' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            📄 Rodapé
          </Button>
        </div>

        {activeTab === 'catalog-products' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Produtos do Catálogo</h2>
                <p className="text-gray-400 mt-1">
                  {products.filter(p => p.catalog_active).length} ativos · {products.filter(p => !p.catalog_active).length} inativos
                </p>
              </div>
              <Button
                onClick={() => navigate(createPageUrl('AddCatalogProduct'))}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Produto
              </Button>
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-4">Nenhum produto no catálogo ainda</p>
                <Button
                  onClick={() => navigate(createPageUrl('AddCatalogProduct'))}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeiro Produto
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Produtos Ativos */}
                {products.filter(p => p.catalog_active).length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                      ✅ Ativos no Catálogo ({products.filter(p => p.catalog_active).length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {products.filter(p => p.catalog_active).map((product) => (
                        <div
                          key={product.id}
                          className="bg-gray-800 rounded-lg overflow-hidden border border-green-500 hover:border-green-400 transition-colors cursor-pointer"
                          onClick={() => navigate(createPageUrl('AddCatalogProduct'), { state: { sourceProduct: product } })}
                        >
                          <div className="aspect-square bg-gray-900 relative">
                            {product.image_urls && product.image_urls.length > 0 ? (
                              <img
                                src={product.image_urls[0]}
                                alt={product.description}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-16 h-16 text-gray-600" />
                              </div>
                            )}
                            <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
                              R$ {product.price_catalog?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="text-white font-semibold mb-2 line-clamp-2">
                              {product.description || 'Sem título'}
                            </h3>
                            <div className="flex items-center justify-between text-sm text-gray-400">
                              <span>Estoque: {product.quantity || 0}</span>
                              {product.seller_name && (
                                <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                                  {product.seller_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Produtos Inativos */}
                {products.filter(p => !p.catalog_active).length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-400 mb-4 flex items-center gap-2">
                      ⛔ Inativos ({products.filter(p => !p.catalog_active).length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {products.filter(p => !p.catalog_active).map((product) => (
                        <div
                          key={product.id}
                          className="bg-gray-800 rounded-lg overflow-hidden border border-gray-600 hover:border-gray-500 transition-colors cursor-pointer opacity-75"
                          onClick={() => navigate(createPageUrl('AddCatalogProduct'), { state: { sourceProduct: product } })}
                        >
                          <div className="aspect-square bg-gray-900 relative">
                            {product.image_urls && product.image_urls.length > 0 ? (
                              <img
                                src={product.image_urls[0]}
                                alt={product.description}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-16 h-16 text-gray-600" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">INATIVO</span>
                            </div>
                            <div className="absolute top-2 right-2 bg-gray-600 text-white text-xs font-bold px-2 py-1 rounded">
                              R$ {product.price_catalog?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="text-gray-300 font-semibold mb-2 line-clamp-2">
                              {product.description || 'Sem título'}
                            </h3>
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <span>Estoque: {product.quantity || 0}</span>
                              {product.seller_name && (
                                <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                                  {product.seller_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'banners' && (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white">Banners do Catálogo</h2>
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
            {catalogBanners.filter(b => b.is_active).length > 0 && (
              <Card className="bg-gray-800 border-gray-700 mb-8">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Preview dos Banners Ativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catalogBanners.filter(b => b.is_active).map((banner) => (
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
              <Droppable droppableId="catalogBanners">
                {(provided) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    {catalogBanners.map((banner, index) => (
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

        {activeTab === 'produtos' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Produtos em Destaque</h2>
              <p className="text-gray-400">Gerencie quais produtos aparecem na seção de destaque do catálogo (máximo 4)</p>
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.filter(p => p.catalog_active && p.is_featured).length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
                      ⭐ Em Destaque ({products.filter(p => p.is_featured).length}/4)
                    </h3>
                    <div className="space-y-3">
                      {products.filter(p => p.is_featured).map((product) => (
                        <div
                          key={product.id}
                          className="bg-gray-800 rounded-lg border border-yellow-500 p-4 flex items-center gap-4"
                        >
                          <div className="w-16 h-16 flex-shrink-0">
                            {product.image_urls && product.image_urls.length > 0 ? (
                              <img
                                src={product.image_urls[0]}
                                alt={product.description}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-700 rounded-lg flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-600" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1">
                            <h4 className="text-white font-semibold line-clamp-2">
                              {product.description || 'Sem título'}
                            </h4>
                            <p className="text-gray-400 text-sm">
                              R$ {product.price_catalog?.toFixed(2) || '0.00'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingFeaturedProduct(product)}
                              className="p-2 hover:bg-gray-700 rounded transition-colors text-blue-400 hover:text-blue-300"
                              title="Editar nome"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleFeatured(product)}
                              className="p-2 hover:bg-gray-700 rounded transition-colors text-yellow-400 hover:text-yellow-300"
                              title="Remover do destaque"
                            >
                              <Star className="w-4 h-4 fill-yellow-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold text-gray-400 mb-4">Adicionar ao Destaque</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {products
                      .filter(p => p.catalog_active && !p.is_featured)
                      .slice(0, 10)
                      .map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handleToggleFeatured(product)}
                          className="w-full bg-gray-700 hover:bg-gray-600 rounded-lg p-3 text-left transition-colors flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm line-clamp-1">
                              {product.description || 'Sem título'}
                            </p>
                            <p className="text-gray-400 text-xs">
                              R$ {product.price_catalog?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                          <Star className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {editingFeaturedProduct && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <Card className="bg-gray-800 border-gray-700 max-w-md w-full">
                  <CardHeader>
                    <CardTitle className="text-white">Editar Nome do Produto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        handleUpdateFeaturedProduct(
                          editingFeaturedProduct.id,
                          formData.get('description')
                        );
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <Label className="text-gray-300">Nome do Produto</Label>
                        <Input
                          type="text"
                          name="description"
                          defaultValue={editingFeaturedProduct.description || ''}
                          placeholder="Digite o nome do produto"
                          maxLength={60}
                          className="bg-gray-700 text-white border-gray-600"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingFeaturedProduct(null)}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                          Salvar
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rodape' && (
          <div className="text-center py-12">
            <h2 className="text-2xl text-white mb-4">Rodapé</h2>
            <p className="text-gray-400">Em breve: configuração do rodapé</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BannerForm({ banner, onSave, onCancel, onUploadImage }) {
  const [formData, setFormData] = useState(banner);
  const [isUploading, setIsUploading] = useState(false);
  const [showPositionEditor, setShowPositionEditor] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const imageUrl = await onUploadImage(file);
    if (imageUrl) {
      setFormData({ ...formData, image_url: imageUrl, image_adjustments: null });
      toast.success('Imagem enviada com sucesso!');
    }
    setIsUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.image_url) {
      toast.error('É necessário fazer upload de uma imagem');
      return;
    }
    console.log('📤 Salvando banner com ajustes:', formData.image_adjustments);
    onSave(formData);
  };

  return (
    <>
      {showPositionEditor && formData.image_url && (
        <ImagePositionEditor
          imageUrl={formData.image_url}
          deviceType={formData.device_type}
          initialAdjustments={formData.image_adjustments}
          onSave={(adjustments) => {
            console.log('💾 Salvando ajustes:', adjustments);
            setFormData(prev => ({ ...prev, image_adjustments: adjustments }));
            setShowPositionEditor(false);
            toast.success('✅ Posição ajustada! Clique em "Salvar Banner" para aplicar.');
          }}
          onCancel={() => setShowPositionEditor(false)}
        />
      )}

      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <Card className="bg-gray-800 border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <CardTitle className="text-white">
              {banner.id ? 'Editar Banner do Catálogo' : 'Novo Banner do Catálogo'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-gray-300">Imagem do Banner</Label>
                {formData.image_url && (
                  <div className="relative">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg mb-2"
                    />
                    <Button
                      type="button"
                      onClick={() => setShowPositionEditor(true)}
                      className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      <Move className="w-4 h-4 mr-2" />
                      Ajustar Posição
                    </Button>
                  </div>
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
                {formData.device_type === 'desktop' ? '📐 Recomendado: 1920x600px' : '📱 Recomendado: 800x600px'}
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
    </>
  );
}