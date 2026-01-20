import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Upload, X, Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateCatalogProduct() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageUrls, setImageUrls] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    price_catalog: '',
    quantity: 1,
    qty_perfeito: 1,
    qty_bom: 0,
    qty_oficina: 0,
    cost_price: '',
    notes: '',
    peso: '',
    comprimento: '',
    altura: '',
    largura: '',
    catalog_active: true
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.role !== 'admin') {
        toast.error('Acesso negado! Apenas administradores.');
        navigate(createPageUrl('Home'));
      }
    } else {
      navigate(createPageUrl('Home'));
    }
  }, [navigate]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        if (result?.file_url) {
          uploadedUrls.push(result.file_url);
        }
      }
      setImageUrls(prev => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} imagem(ns) enviada(s)!`);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      toast.error('Preencha a descrição do produto');
      return;
    }

    if (!formData.price_catalog || parseFloat(formData.price_catalog) <= 0) {
      toast.error('Preencha o preço do catálogo');
      return;
    }

    setIsSaving(true);
    try {
      const productData = {
        description: formData.description,
        price_catalog: parseFloat(formData.price_catalog),
        quantity: parseInt(formData.quantity) || 1,
        qty_perfeito: parseInt(formData.qty_perfeito) || 0,
        qty_bom: parseInt(formData.qty_bom) || 0,
        qty_oficina: parseInt(formData.qty_oficina) || 0,
        cost_price: parseFloat(formData.cost_price) || 0,
        notes: formData.notes,
        peso: formData.peso ? parseFloat(formData.peso) : null,
        comprimento: formData.comprimento ? parseFloat(formData.comprimento) : null,
        altura: formData.altura ? parseFloat(formData.altura) : null,
        largura: formData.largura ? parseFloat(formData.largura) : null,
        catalog_active: true,
        image_urls: imageUrls,
        status: 'ESTOQUE',
        deposit_name: 'Bangu'
      };

      await base44.entities.Product.create(productData);
      
      // Limpa cache
      sessionStorage.removeItem('products_cache_v3');
      sessionStorage.removeItem('products_cache_time_v3');
      sessionStorage.removeItem('products_catalog_cache');
      sessionStorage.removeItem('products_catalog_cache_time');

      toast.success('Produto criado e publicado no catálogo!');
      navigate(createPageUrl('ProductManagement'));
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      toast.error('Erro ao criar produto');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl('ProductManagement'))}
            className="border-gray-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-600" />
              Criar Produto para Catálogo
            </h1>
            <p className="text-gray-500 text-sm">O produto será publicado diretamente no catálogo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna Esquerda - Dados do Produto */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Dados do Produto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-700">Descrição do Produto *</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ex: Fritadeira Air Fryer 8L Philips"
                    className="bg-white border-gray-300 text-gray-900"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700">Preço do Catálogo (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price_catalog}
                      onChange={(e) => setFormData({ ...formData, price_catalog: e.target.value })}
                      placeholder="0.00"
                      className="bg-white border-gray-300 text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">Custo (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      placeholder="0.00"
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-700 mb-2 block">Quantidade em Estoque</Label>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label className="text-gray-500 text-xs">Total</Label>
                      <Input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900"
                        min="1"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Perfeito</Label>
                      <Input
                        type="number"
                        value={formData.qty_perfeito}
                        onChange={(e) => setFormData({ ...formData, qty_perfeito: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Bom</Label>
                      <Input
                        type="number"
                        value={formData.qty_bom}
                        onChange={(e) => setFormData({ ...formData, qty_bom: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Oficina</Label>
                      <Input
                        type="number"
                        value={formData.qty_oficina}
                        onChange={(e) => setFormData({ ...formData, qty_oficina: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-700">Observações</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Informações adicionais sobre o produto..."
                    className="bg-white border-gray-300 text-gray-900"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Coluna Direita - Imagens e Dimensões */}
            <div className="space-y-6">
              {/* Imagens */}
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900">Imagens do Produto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Preview de Imagens */}
                    {imageUrls.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {imageUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Imagem ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload */}
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      {isUploading ? (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span>Enviando...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-gray-500">
                          <Upload className="w-8 h-8 mb-2" />
                          <span className="text-sm">Clique para enviar imagens</span>
                          <span className="text-xs text-gray-400">PNG, JPG até 5MB</span>
                        </div>
                      )}
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Dimensões para Frete */}
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900 text-base">Dimensões (para cálculo de frete)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-500 text-xs">Peso (kg)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.peso}
                        onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
                        placeholder="0.00"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Comprimento (cm)</Label>
                      <Input
                        type="number"
                        value={formData.comprimento}
                        onChange={(e) => setFormData({ ...formData, comprimento: e.target.value })}
                        placeholder="0"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Altura (cm)</Label>
                      <Input
                        type="number"
                        value={formData.altura}
                        onChange={(e) => setFormData({ ...formData, altura: e.target.value })}
                        placeholder="0"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Largura (cm)</Label>
                      <Input
                        type="number"
                        value={formData.largura}
                        onChange={(e) => setFormData({ ...formData, largura: e.target.value })}
                        placeholder="0"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl('ProductManagement'))}
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Criar e Publicar no Catálogo
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}