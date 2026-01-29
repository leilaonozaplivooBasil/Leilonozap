import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, 
  Loader2, 
  Upload, 
  X,
  Package,
  DollarSign,
  Warehouse,
  Ruler,
  ShoppingCart,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function AddCatalogProduct() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrls, setImageUrls] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    // Básico
    description: '',
    lot: '',
    notes: '',
    purchase_order: '',
    
    // Estoque
    quantity: 1,
    qty_perfeito: 0,
    qty_bom: 0,
    qty_ruim: 0,
    qty_oficina: 0,
    
    // Preços
    cost_price: '',
    selling_price_retail: '',
    selling_price_wholesale: '',
    price_auction_start: '',
    price_buy_now: '',
    price_catalog: '',
    
    // Catálogo
    catalog_active: true,
    
    // Dimensões (frete)
    peso: '',
    comprimento: '',
    altura: '',
    largura: '',
    
    // Mercado
    market_value: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImage(true);
    const uploadedUrls = [];

    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
        toast.success(`Imagem ${files.indexOf(file) + 1} enviada!`);
      } catch (error) {
        toast.error(`Erro ao enviar imagem: ${error.message}`);
      }
    }

    setImageUrls(prev => [...prev, ...uploadedUrls]);
    setUploadingImage(false);
  };

  const removeImage = (index) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validações
    if (!formData.description.trim()) {
      toast.error('Preencha a descrição do produto');
      return;
    }

    if (!formData.cost_price || parseFloat(formData.cost_price) <= 0) {
      toast.error('Preencha o preço de custo');
      return;
    }

    if (formData.catalog_active && (!formData.price_catalog || parseFloat(formData.price_catalog) <= 0)) {
      toast.error('Preencha o preço do catálogo para ativar no catálogo');
      return;
    }

    if (imageUrls.length === 0) {
      toast.error('Adicione pelo menos uma imagem do produto');
      return;
    }

    setIsSubmitting(true);

    try {
      const productData = {
        description: formData.description.trim(),
        lot: formData.lot.trim() || null,
        notes: formData.notes.trim() || null,
        purchase_order: formData.purchase_order.trim() || null,
        image_urls: imageUrls,
        
        quantity: parseInt(formData.quantity) || 1,
        qty_perfeito: parseInt(formData.qty_perfeito) || 0,
        qty_bom: parseInt(formData.qty_bom) || 0,
        qty_ruim: parseInt(formData.qty_ruim) || 0,
        qty_oficina: parseInt(formData.qty_oficina) || 0,
        
        cost_price: parseFloat(formData.cost_price),
        selling_price_retail: parseFloat(formData.selling_price_retail) || null,
        selling_price_wholesale: parseFloat(formData.selling_price_wholesale) || null,
        price_auction_start: parseFloat(formData.price_auction_start) || null,
        price_buy_now: parseFloat(formData.price_buy_now) || null,
        price_catalog: parseFloat(formData.price_catalog) || null,
        
        catalog_active: formData.catalog_active,
        
        peso: parseFloat(formData.peso) || null,
        comprimento: parseFloat(formData.comprimento) || null,
        altura: parseFloat(formData.altura) || null,
        largura: parseFloat(formData.largura) || null,
        
        market_value: parseFloat(formData.market_value) || null,
        
        status: 'ESTOQUE',
        quantity_sold: 0,
        sold_amount: 0,
        profit: 0,
        date: new Date().toISOString().split('T')[0]
      };

      await base44.entities.Product.create(productData);
      
      toast.success('✅ Produto adicionado ao catálogo com sucesso!');
      navigate(createPageUrl('CatalogManagement'));
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(createPageUrl('CatalogManagement'))}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-white">Adicionar Produto ao Catálogo</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Seção 1: Informações Básicas */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Package className="w-5 h-5 text-blue-400" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Descrição do Produto *</Label>
                <Textarea
                  placeholder="Ex: Processador Intel Core i7 10700K"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-300">Lote/SKU</Label>
                  <Input
                    placeholder="Ex: LOTE-001"
                    value={formData.lot}
                    onChange={(e) => handleInputChange('lot', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Nota Fiscal</Label>
                  <Input
                    placeholder="Ex: 0001"
                    value={formData.purchase_order}
                    onChange={(e) => handleInputChange('purchase_order', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Valor de Mercado</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={formData.market_value}
                    onChange={(e) => handleInputChange('market_value', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300">Observações</Label>
                <Textarea
                  placeholder="Informações adicionais sobre o produto..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 min-h-[60px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Seção 2: Imagens */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Upload className="w-5 h-5 text-purple-400" />
                Imagens do Produto *
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
                    {uploadingImage ? (
                      <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-3" />
                    ) : (
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    )}
                    <p className="text-gray-300 font-medium">Clique para fazer upload</p>
                    <p className="text-gray-500 text-sm mt-1">Selecione múltiplas imagens</p>
                  </div>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </Label>
              </div>

              {imageUrls.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Produto ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg bg-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                      {index === 0 && (
                        <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          Principal
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seção 3: Preços */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <DollarSign className="w-5 h-5 text-green-400" />
                Precificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Preço de Custo (C.U.L) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={formData.cost_price}
                    onChange={(e) => handleInputChange('cost_price', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Preço Varejo (P/V)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={formData.selling_price_retail}
                    onChange={(e) => handleInputChange('selling_price_retail', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Preço Licenciado (P/LIC)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={formData.selling_price_wholesale}
                    onChange={(e) => handleInputChange('selling_price_wholesale', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5"
                  />
                </div>
                <div className="relative">
                  <Label className="text-gray-300">Preço Catálogo {formData.catalog_active && '*'}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={formData.price_catalog}
                    onChange={(e) => handleInputChange('price_catalog', e.target.value)}
                    className={`bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 ${
                      formData.catalog_active ? 'border-green-500' : ''
                    }`}
                  />
                  {formData.catalog_active && (
                    <div className="absolute -top-1 -right-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                <h4 className="text-white font-medium mb-3">Preços para Leilões (opcional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300 text-sm">Lance Inicial</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="R$ 0,00"
                      value={formData.price_auction_start}
                      onChange={(e) => handleInputChange('price_auction_start', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Arremate Agora</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="R$ 0,00"
                      value={formData.price_buy_now}
                      onChange={(e) => handleInputChange('price_buy_now', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção 4: Estoque */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Warehouse className="w-5 h-5 text-yellow-400" />
                Controle de Estoque
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <Label className="text-gray-300 text-sm">Qtd. Total</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Perfeito</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.qty_perfeito}
                    onChange={(e) => handleInputChange('qty_perfeito', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Bom</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.qty_bom}
                    onChange={(e) => handleInputChange('qty_bom', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Ruim</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.qty_ruim}
                    onChange={(e) => handleInputChange('qty_ruim', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Oficina</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.qty_oficina}
                    onChange={(e) => handleInputChange('qty_oficina', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white mt-1.5"
                  />
                </div>
              </div>

              <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-blue-300 text-sm">
                  A quantidade total deve ser a soma dos estados individuais. O sistema não calcula automaticamente.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Seção 5: Dimensões (Frete) */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Ruler className="w-5 h-5 text-orange-400" />
                Dimensões (Para Cálculo de Frete)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-gray-300 text-sm">Peso (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.peso}
                    onChange={(e) => handleInputChange('peso', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Comprimento (cm)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.comprimento}
                    onChange={(e) => handleInputChange('comprimento', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Altura (cm)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.altura}
                    onChange={(e) => handleInputChange('altura', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Largura (cm)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.largura}
                    onChange={(e) => handleInputChange('largura', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção 6: Catálogo */}
          <Card className="bg-gray-800 border-gray-700 border-2 border-green-600/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <ShoppingCart className="w-5 h-5 text-green-400" />
                Disponibilidade no Catálogo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                <div>
                  <p className="text-white font-medium">Ativar no Catálogo</p>
                  <p className="text-gray-400 text-sm">Tornar este produto visível para licenciados</p>
                </div>
                <Switch
                  checked={formData.catalog_active}
                  onCheckedChange={(checked) => handleInputChange('catalog_active', checked)}
                  className="data-[state=checked]:bg-green-600"
                />
              </div>
              
              {formData.catalog_active && (
                <div className="mt-4 bg-green-600/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-green-400 text-sm">
                    ✅ Este produto estará disponível no catálogo para licenciados após ser criado.
                  </p>
                  <p className="text-green-300 text-xs mt-2">
                    Certifique-se de preencher o <strong>Preço Catálogo</strong> antes de salvar.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              onClick={() => navigate(createPageUrl('CatalogManagement'))}
              variant="outline"
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white px-8"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Adicionar Produto'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}