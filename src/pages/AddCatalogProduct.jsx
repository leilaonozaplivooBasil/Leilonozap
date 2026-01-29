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
      {/* Header Compacto */}
      <div className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(createPageUrl('CatalogManagement'))}
              className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-white">Adicionar Produto ao Catálogo</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Informações Básicas - Layout Compacto */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
              <Package className="w-4 h-4 text-blue-400" />
              <span>Informações Básicas</span>
            </div>

            <div>
              <Label className="text-gray-300 text-sm">Descrição do Produto *</Label>
              <Textarea
                placeholder="Ex: Processador Intel Core i7 10700K"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 min-h-[70px] text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-gray-300 text-xs">Lote/SKU</Label>
                <Input
                  placeholder="Ex: LOTE-001"
                  value={formData.lot}
                  onChange={(e) => handleInputChange('lot', e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Nota Fiscal</Label>
                <Input
                  placeholder="Ex: 0001"
                  value={formData.purchase_order}
                  onChange={(e) => handleInputChange('purchase_order', e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Valor de Mercado</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="R$ 0,00"
                  value={formData.market_value}
                  onChange={(e) => handleInputChange('market_value', e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-9 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-xs">Observações</Label>
              <Textarea
                placeholder="Informações adicionais sobre o produto..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 min-h-[50px] text-sm"
              />
            </div>
          </div>

          {/* Imagens - Layout Compacto */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
              <Upload className="w-4 h-4 text-purple-400" />
              <span>Imagens do Produto *</span>
            </div>

            <Label htmlFor="image-upload" className="cursor-pointer block">
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-purple-500 hover:bg-gray-700/30 transition-all">
                {uploadingImage ? (
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
                ) : (
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                )}
                <p className="text-gray-300 text-sm font-medium">Clique para fazer upload</p>
                <p className="text-gray-500 text-xs mt-0.5">Selecione múltiplas imagens</p>
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

            {imageUrls.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {imageUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Produto ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg bg-gray-700 border border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    {index === 0 && (
                      <div className="absolute bottom-1.5 left-1.5 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                        Principal
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preços - Layout Grid Compacto */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span>Precificação</span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-gray-300 text-xs">Custo (C.U.L) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="R$ 0,00"
                  value={formData.cost_price}
                  onChange={(e) => handleInputChange('cost_price', e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Varejo (P/V)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="R$ 0,00"
                  value={formData.selling_price_retail}
                  onChange={(e) => handleInputChange('selling_price_retail', e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Licenciado (P/LIC)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="R$ 0,00"
                  value={formData.selling_price_wholesale}
                  onChange={(e) => handleInputChange('selling_price_wholesale', e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-9 text-sm"
                />
              </div>
              <div className="relative">
                <Label className="text-gray-300 text-xs">Catálogo {formData.catalog_active && '*'}</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="R$ 0,00"
                  value={formData.price_catalog}
                  onChange={(e) => handleInputChange('price_catalog', e.target.value)}
                  className={`bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-9 text-sm ${
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

            <div className="bg-gray-700/20 rounded-lg p-3 border border-gray-600/50">
              <p className="text-gray-400 text-xs mb-2.5">Leilões (opcional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-300 text-xs">Lance Inicial</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={formData.price_auction_start}
                    onChange={(e) => handleInputChange('price_auction_start', e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Arremate Agora</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={formData.price_buy_now}
                    onChange={(e) => handleInputChange('price_buy_now', e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Estoque e Dimensões - Grid Lado a Lado */}
          <div className="grid grid-cols-2 gap-4">
            {/* Estoque */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
                <Warehouse className="w-4 h-4 text-yellow-400" />
                <span>Controle de Estoque</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <Label className="text-gray-300 text-xs">Total</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white mt-1.5 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Perfeito</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.qty_perfeito}
                    onChange={(e) => handleInputChange('qty_perfeito', e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white mt-1.5 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Bom</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.qty_bom}
                    onChange={(e) => handleInputChange('qty_bom', e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white mt-1.5 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Ruim</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.qty_ruim}
                    onChange={(e) => handleInputChange('qty_ruim', e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white mt-1.5 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Oficina</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.qty_oficina}
                    onChange={(e) => handleInputChange('qty_oficina', e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white mt-1.5 h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Dimensões */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
                <Ruler className="w-4 h-4 text-orange-400" />
                <span>Dimensões (Frete)</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-gray-300 text-xs">Peso (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.peso}
                    onChange={(e) => handleInputChange('peso', e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Comp. (cm)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.comprimento}
                    onChange={(e) => handleInputChange('comprimento', e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Altura (cm)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.altura}
                    onChange={(e) => handleInputChange('altura', e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Larg. (cm)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.largura}
                    onChange={(e) => handleInputChange('largura', e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Catálogo - Compacto */}
          <div className="bg-gray-800/50 border border-green-600/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-4 h-4 text-green-400" />
                <div>
                  <p className="text-white text-sm font-medium">Ativar no Catálogo</p>
                  <p className="text-gray-400 text-xs">Tornar visível para licenciados</p>
                </div>
              </div>
              <Switch
                checked={formData.catalog_active}
                onCheckedChange={(checked) => handleInputChange('catalog_active', checked)}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
            
            {formData.catalog_active && (
              <div className="mt-3 bg-green-600/10 border border-green-500/30 rounded-lg p-3">
                <p className="text-green-400 text-xs">
                  ✅ Produto disponível no catálogo após salvar. Preencha o <strong>Preço Catálogo</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Botões de Ação - Compactos */}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              onClick={() => navigate(createPageUrl('CatalogManagement'))}
              variant="outline"
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 h-9 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white px-8 h-9 text-sm font-medium"
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