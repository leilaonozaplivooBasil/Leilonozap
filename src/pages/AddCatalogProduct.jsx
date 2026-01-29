import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Camera, Loader2, Plus, X, Image as ImageIcon, Edit2, Trash2 } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function AddCatalogProduct() {
  const navigate = useNavigate();
  
  // Estados do formulário
  const [currentSection, setCurrentSection] = useState('geral');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Estados de categorias
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [selectedParentForSub, setSelectedParentForSub] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  
  const [formData, setFormData] = useState({
    // Informações Gerais
    title: '',
    description: '',
    category: '',
    subcategory: '',
    
    // Códigos
    sku: '',
    barcode: '',
    gerar_barcode_automatico: false,
    
    // Especificações
    condition: 'Novo',
    brand: '',
    model: '',
    
    // Dimensões e peso
    weight: '',
    length: '',
    height: '',
    width: '',
    
    // Variações
    has_variations: false,
    variation_type: '', // cor, tamanho, etc
    variations: [],
    
    // Fotos
    image_urls: [],
    
    // Preço
    price: '',
    cost_price: '',
    compare_price: '',
    
    // Catálogo
    catalog_active: false,
    quantity: 1,
    
    // Campos existentes
    lot: '',
    purchase_order: '',
    notes: ''
  });
  
  // Carrega categorias e subcategorias
  useEffect(() => {
    loadCategories();
  }, []);
  
  useEffect(() => {
    if (formData.category) {
      const filtered = subcategories.filter(sub => sub.parent_category_id === formData.category);
      setFilteredSubcategories(filtered);
    } else {
      setFilteredSubcategories([]);
    }
  }, [formData.category, subcategories]);
  
  const loadCategories = async () => {
    try {
      const allCategories = await base44.entities.Category.list();
      const mainCategories = allCategories.filter(cat => !cat.parent_category_id);
      const subs = allCategories.filter(cat => cat.parent_category_id);
      setCategories(mainCategories);
      setSubcategories(subs);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Se mudou a categoria, limpa a subcategoria
    if (field === 'category') {
      setFormData(prev => ({ ...prev, subcategory: '' }));
    }
  };
  
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      if (editingCategory) {
        await base44.entities.Category.update(editingCategory.id, {
          name: newCategoryName.trim()
        });
      } else {
        await base44.entities.Category.create({
          name: newCategoryName.trim(),
          is_active: true
        });
      }
      setNewCategoryName('');
      setEditingCategory(null);
      loadCategories();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      alert('Erro ao salvar categoria');
    }
  };
  
  const handleDeleteCategory = async (id) => {
    if (!confirm('Deseja excluir esta categoria?')) return;
    
    try {
      await base44.entities.Category.delete(id);
      loadCategories();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      alert('Erro ao excluir categoria');
    }
  };
  
  const handleCreateSubcategory = async () => {
    if (!newSubcategoryName.trim() || !selectedParentForSub) return;
    
    try {
      const parentCategory = categories.find(c => c.id === selectedParentForSub);
      
      if (editingSubcategory) {
        await base44.entities.Category.update(editingSubcategory.id, {
          name: newSubcategoryName.trim(),
          parent_category_id: selectedParentForSub,
          parent_category_name: parentCategory?.name || ''
        });
      } else {
        await base44.entities.Category.create({
          name: newSubcategoryName.trim(),
          parent_category_id: selectedParentForSub,
          parent_category_name: parentCategory?.name || '',
          is_active: true
        });
      }
      setNewSubcategoryName('');
      setSelectedParentForSub('');
      setEditingSubcategory(null);
      loadCategories();
    } catch (error) {
      console.error('Erro ao salvar subcategoria:', error);
      alert('Erro ao salvar subcategoria');
    }
  };
  
  const handleDeleteSubcategory = async (id) => {
    if (!confirm('Deseja excluir esta subcategoria?')) return;
    
    try {
      await base44.entities.Category.delete(id);
      loadCategories();
    } catch (error) {
      console.error('Erro ao excluir subcategoria:', error);
      alert('Erro ao excluir subcategoria');
    }
  };
  
  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploadingImage(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return file_url;
      });
      
      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        image_urls: [...prev.image_urls, ...uploadedUrls]
      }));
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload das imagens');
    } finally {
      setUploadingImage(false);
    }
  };
  
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleImageUpload(files);
    }
  };
  
  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== index)
    }));
  };
  
  const addVariation = () => {
    const newVariation = {
      id: Date.now(),
      name: '',
      stock: 0,
      price_adjustment: 0
    };
    setFormData(prev => ({
      ...prev,
      variations: [...prev.variations, newVariation]
    }));
  };
  
  const removeVariation = (id) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.filter(v => v.id !== id)
    }));
  };
  
  const updateVariation = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations.map(v => 
        v.id === id ? { ...v, [field]: value } : v
      )
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.price) {
      alert('Por favor, preencha o título e o preço do produto');
      return;
    }
    
    if (formData.catalog_active && formData.image_urls.length === 0) {
      alert('Por favor, adicione pelo menos uma imagem ao produto');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const productData = {
        description: formData.title,
        notes: formData.description,
        image_urls: formData.image_urls,
        price_catalog: parseFloat(formData.price) || 0,
        cost_price: parseFloat(formData.cost_price) || 0,
        market_value: parseFloat(formData.compare_price) || 0,
        catalog_active: formData.catalog_active,
        quantity: parseInt(formData.quantity) || 1,
        peso: parseFloat(formData.weight) || 0,
        comprimento: parseFloat(formData.length) || 0,
        altura: parseFloat(formData.height) || 0,
        largura: parseFloat(formData.width) || 0,
        lot: formData.sku || formData.lot,
        purchase_order: formData.purchase_order
      };
      
      await base44.entities.Product.create(productData);
      alert('Produto adicionado com sucesso!');
      navigate(createPageUrl('CatalogManagement'));
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert('Erro ao salvar o produto. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const sections = [
    { id: 'geral', label: 'Informação Gerais' },
    { id: 'variacoes', label: 'Estrutura e variações' },
    { id: 'fotos', label: 'Fotos' },
    { id: 'preco', label: 'Preço' }
  ];
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Camera className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {formData.title || 'Novo produto'}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className={`w-2 h-2 rounded-full ${formData.catalog_active ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                <span>{formData.catalog_active ? 'Ativo' : 'Inativo'}</span>
                <span>|</span>
                <span>Estoque: {formData.quantity || 0}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => navigate(createPageUrl('CatalogManagement'))}
              variant="outline"
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Analisar produto'
              )}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar de navegação */}
          <div className="w-48 flex-shrink-0">
            <div className="bg-white rounded-lg border p-2 sticky top-28">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setCurrentSection(section.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    currentSection === section.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Conteúdo principal */}
          <div className="flex-1">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Seção: Informações Gerais */}
              {currentSection === 'geral' && (
                <div className="space-y-6">
                  {/* Título e Descrição */}
                  <div className="bg-white rounded-lg border p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">
                      Título e descrição
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-gray-700 mb-1.5 block">
                          Nome <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={formData.title}
                          onChange={(e) => handleInputChange('title', e.target.value)}
                          placeholder="Ex: Notebook Dell Inspiron 15"
                          className="bg-white border-gray-300"
                          maxLength={60}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.title.length}/60 caracteres restantes
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <Label className="text-sm text-gray-700">Descrição</Label>
                          <button
                            type="button"
                            className="text-sm text-purple-600 hover:text-purple-700"
                          >
                            🪄 Usar IA
                          </button>
                        </div>
                        <ReactQuill
                          value={formData.description}
                          onChange={(value) => handleInputChange('description', value)}
                          theme="snow"
                          className="bg-white"
                          modules={{
                            toolbar: [
                              ['bold', 'italic', 'underline'],
                              [{ list: 'ordered' }, { list: 'bullet' }],
                              ['link'],
                              ['clean']
                            ]
                          }}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          5/200 caracteres restantes
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Categoria e Subcategoria */}
                  <div className="bg-white rounded-lg border p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-semibold text-gray-900">
                        Categoria e subcategoria
                      </h2>
                      <button
                        type="button"
                        className="text-sm text-purple-600 hover:text-purple-700"
                      >
                        🔍 Como as categorias funcionam?
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-700 mb-1.5 block">Categoria</Label>
                        <select
                          value={formData.category}
                          onChange={(e) => handleInputChange('category', e.target.value)}
                          className="w-full h-10 px-3 border border-gray-300 rounded-md bg-white text-sm"
                        >
                          <option value="">Primeiro escolha uma categoria</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowCategoryModal(true)}
                          className="text-xs text-pink-600 hover:text-pink-700 mt-1"
                        >
                          Gerenciar
                        </button>
                      </div>
                      
                      <div>
                        <Label className="text-sm text-gray-700 mb-1.5 block">Subcategoria</Label>
                        <select
                          value={formData.subcategory}
                          onChange={(e) => handleInputChange('subcategory', e.target.value)}
                          className="w-full h-10 px-3 border border-gray-300 rounded-md bg-white text-sm"
                          disabled={!formData.category}
                        >
                          <option value="">Selecione ou crie uma subcategoria</option>
                          {filteredSubcategories.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedParentForSub(formData.category);
                            setShowSubcategoryModal(true);
                          }}
                          className="text-xs text-pink-600 hover:text-pink-700 mt-1"
                          disabled={!formData.category}
                        >
                          Gerenciar
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Códigos de Identificação */}
                  <div className="bg-white rounded-lg border p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">
                      Códigos de identificação
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-700 mb-1.5 block">
                          Tipo de código de barras
                        </Label>
                        <select className="w-full h-10 px-3 border border-gray-300 rounded-md bg-white text-sm">
                          <option>Não possui código de barras</option>
                          <option>EAN</option>
                          <option>UPC</option>
                        </select>
                      </div>
                      
                      <div>
                        <Label className="text-sm text-gray-700 mb-1.5 block">
                          Código de barras
                        </Label>
                        <Input
                          value={formData.barcode}
                          onChange={(e) => handleInputChange('barcode', e.target.value)}
                          placeholder="Código do barras do produto"
                          className="bg-white border-gray-300"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <Label className="text-sm text-gray-700 mb-1.5 block">
                          Código interno (SKU)
                        </Label>
                        <Input
                          value={formData.sku}
                          onChange={(e) => handleInputChange('sku', e.target.value)}
                          placeholder="880200"
                          className="bg-white border-gray-300"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4">
                      <Switch
                        checked={formData.gerar_barcode_automatico}
                        onCheckedChange={(checked) => handleInputChange('gerar_barcode_automatico', checked)}
                      />
                      <span className="text-sm text-gray-700">Gerar automaticamente</span>
                    </div>
                  </div>
                  
                  {/* Especificações */}
                  <div className="bg-white rounded-lg border p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">
                      Especificações
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-gray-700 mb-1.5 block">
                            Condição do produto
                          </Label>
                          <select
                            value={formData.condition}
                            onChange={(e) => handleInputChange('condition', e.target.value)}
                            className="w-full h-10 px-3 border border-gray-300 rounded-md bg-white text-sm"
                          >
                            <option value="Novo">Novo</option>
                            <option value="Usado">Usado</option>
                            <option value="Recondicionado">Recondicionado</option>
                          </select>
                        </div>
                        
                        <div>
                          <Label className="text-sm text-gray-700 mb-1.5 block">
                            Unidade
                          </Label>
                          <select className="w-full h-10 px-3 border border-gray-300 rounded-md bg-white text-sm">
                            <option>Unidade</option>
                            <option>Kit</option>
                            <option>Par</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-gray-700 mb-1.5 block">Marca</Label>
                          <Input
                            value={formData.brand}
                            onChange={(e) => handleInputChange('brand', e.target.value)}
                            placeholder="Marca do produto"
                            className="bg-white border-gray-300"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-sm text-gray-700 mb-1.5 block">Modelo</Label>
                          <Input
                            value={formData.model}
                            onChange={(e) => handleInputChange('model', e.target.value)}
                            placeholder="Modelo do produto"
                            className="bg-white border-gray-300"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Peso e Dimensões */}
                  <div className="bg-white rounded-lg border p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-1">
                      Peso e dimensões do produto
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                      Essas informações influenciam no cálculo do frete. Medir com precisão evita erros no envio.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-700 mb-1.5 block">Peso (Kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.weight}
                          onChange={(e) => handleInputChange('weight', e.target.value)}
                          placeholder="0cm"
                          className="bg-white border-gray-300"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-sm text-gray-700 mb-1.5 block">Altura (cm)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.height}
                          onChange={(e) => handleInputChange('height', e.target.value)}
                          placeholder="0cm"
                          className="bg-white border-gray-300"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-sm text-gray-700 mb-1.5 block">Comprimento (cm)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.length}
                          onChange={(e) => handleInputChange('length', e.target.value)}
                          placeholder="0cm"
                          className="bg-white border-gray-300"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-sm text-gray-700 mb-1.5 block">Largura (cm)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.width}
                          onChange={(e) => handleInputChange('width', e.target.value)}
                          placeholder="0cm"
                          className="bg-white border-gray-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Seção: Estrutura e variações */}
              {currentSection === 'variacoes' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg border p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">
                      Este produto possui variações?
                    </h2>
                    
                    <div className="flex items-center gap-4 mb-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={!formData.has_variations}
                          onChange={() => handleInputChange('has_variations', false)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">Não</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.has_variations}
                          onChange={() => handleInputChange('has_variations', true)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">Sim</span>
                      </label>
                    </div>
                    
                    {formData.has_variations && (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm text-gray-700 mb-3 block">
                            Qual é o tipo de variação principal deste produto?
                          </Label>
                          
                          <div className="flex flex-wrap gap-2 mb-4">
                            {['Cor', 'Tamanho', 'Sabor', 'Material', 'Voltagem'].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => handleInputChange('variation_type', type)}
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                  formData.variation_type === type
                                    ? 'bg-blue-50 border-blue-600 text-blue-700'
                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                          
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-800">
                              💡 Atenção: A variação escolhida não pode ser alterada por restrição de produto.
                            </p>
                          </div>
                        </div>
                        
                        {formData.variation_type && (
                          <div>
                            <Label className="text-sm text-gray-700 mb-2 block">
                              Quais opções de "{formData.variation_type}" este produto possui?
                            </Label>
                            
                            <div className="space-y-2">
                              {formData.variations.map((variation) => (
                                <div key={variation.id} className="flex items-center gap-2">
                                  <Input
                                    value={variation.name}
                                    onChange={(e) => updateVariation(variation.id, 'name', e.target.value)}
                                    placeholder={`Ex: ${formData.variation_type === 'Cor' ? 'Azul' : 'M'}`}
                                    className="flex-1 bg-white border-gray-300"
                                  />
                                  <Input
                                    type="number"
                                    value={variation.stock}
                                    onChange={(e) => updateVariation(variation.id, 'stock', e.target.value)}
                                    placeholder="Estoque"
                                    className="w-24 bg-white border-gray-300"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeVariation(variation.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            
                            <Button
                              type="button"
                              onClick={addVariation}
                              variant="outline"
                              className="mt-3 border-gray-300 text-sm"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Adicionar variação
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!formData.has_variations && (
                      <div>
                        <Label className="text-sm text-gray-700 mb-1.5 block">Estoque</Label>
                        <Input
                          type="number"
                          value={formData.quantity}
                          onChange={(e) => handleInputChange('quantity', e.target.value)}
                          placeholder="1"
                          className="w-32 bg-white border-gray-300"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-blue-900">
                        Avise-me quando um envio estiver abaixo de{' '}
                        <input
                          type="number"
                          defaultValue={1}
                          className="w-16 px-2 py-0.5 border border-blue-300 rounded mx-1 text-center"
                        />
                      </p>
                    </div>
                    <img
                      src="https://via.placeholder.com/100x60"
                      alt="Ilustração"
                      className="w-24 h-auto"
                    />
                  </div>
                </div>
              )}
              
              {/* Seção: Fotos */}
              {currentSection === 'fotos' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg border p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-1">
                      Fotos principais do produto
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                      Arraste as fotos na ordem que quiser e defina a que será a principal do seu produto.
                      {' '}
                      <button type="button" className="text-purple-600 hover:text-purple-700">
                        Buscar fotos
                      </button>
                    </p>
                    
                    {formData.image_urls.length === 0 ? (
                      <label 
                        htmlFor="image-upload" 
                        className="block cursor-pointer"
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <div className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
                          isDragging 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/30'
                        }`}>
                          {uploadingImage ? (
                            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-3" />
                          ) : (
                            <ImageIcon className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-purple-500' : 'text-gray-400'}`} />
                          )}
                          <p className={`text-sm font-medium mb-1 ${isDragging ? 'text-purple-700' : 'text-gray-600'}`}>
                            {isDragging ? 'Solte as fotos aqui' : 'Arraste as fotos até aqui ou clique para fazer upload'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Formato JPG ou PNG. Tamanho máx. 10MB
                          </p>
                        </div>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleImageUpload(e.target.files)}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>
                    ) : (
                      <div>
                        <div 
                          className="grid grid-cols-4 gap-4"
                          onDragEnter={handleDragEnter}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          {formData.image_urls.map((url, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={url}
                                alt={`Produto ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4 text-gray-600" />
                              </button>
                              {index === 0 && (
                                <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded font-medium">
                                  Principal
                                </div>
                              )}
                            </div>
                          ))}
                          
                          <label 
                            htmlFor="image-upload-more" 
                            className="cursor-pointer"
                            onDragEnter={(e) => e.stopPropagation()}
                          >
                            <div className={`w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center transition-all ${
                              isDragging 
                                ? 'border-purple-500 bg-purple-50' 
                                : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/30'
                            }`}>
                              {uploadingImage ? (
                                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                              ) : (
                                <Plus className={`w-8 h-8 ${isDragging ? 'text-purple-500' : 'text-gray-400'}`} />
                              )}
                            </div>
                            <input
                              id="image-upload-more"
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => handleImageUpload(e.target.files)}
                              className="hidden"
                              disabled={uploadingImage}
                            />
                          </label>
                        </div>
                        
                        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                          <div className="flex-1">
                            <p className="text-sm text-yellow-800 font-medium mb-1">
                              Essas são fotos principais do produto. Você também pode definir fotos específicas por variação de marcante.
                            </p>
                            <button
                              type="button"
                              className="text-sm text-yellow-900 underline hover:no-underline"
                            >
                              Sim
                            </button>
                            {' • '}
                            <button
                              type="button"
                              className="text-sm text-yellow-900 underline hover:no-underline"
                            >
                              Continuar da mesma forma
                            </button>
                          </div>
                          <img
                            src="https://via.placeholder.com/100x60"
                            alt="Ilustração"
                            className="w-24 h-auto"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Seção: Preço */}
              {currentSection === 'preco' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg border p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">
                      Preço do produto
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <Label className="text-sm text-gray-700 mb-1.5 block">
                          Preço <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => handleInputChange('price', e.target.value)}
                          placeholder="R$ 0,00"
                          className="bg-white border-gray-300"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-sm text-gray-700 mb-1.5 block">
                          Preço de custo
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.cost_price}
                          onChange={(e) => handleInputChange('cost_price', e.target.value)}
                          placeholder="R$ 0,00"
                          className="bg-white border-gray-300"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <Label className="text-sm text-gray-700 mb-1.5 block">
                          Margem de lucro
                        </Label>
                        <div className="flex items-center gap-4">
                          <Input
                            type="text"
                            value={formData.price && formData.cost_price 
                              ? `R$ ${(parseFloat(formData.price) - parseFloat(formData.cost_price)).toFixed(2)}`
                              : 'R$ 0,00'
                            }
                            readOnly
                            className="flex-1 bg-gray-50 border-gray-300"
                          />
                          <button
                            type="button"
                            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                          >
                            🧮 Análise comparativa
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm text-blue-900 font-medium mb-2">
                          💡 Sugestão de preço comparativo
                        </p>
                        <p className="text-sm text-blue-800 mb-3">
                          Encontre o código de barras do seu produto e gere análise comparativa com o mercado.
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-blue-300 text-blue-700 bg-white"
                          >
                            Sim
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-blue-700"
                          >
                            Não
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-blue-700"
                          >
                            Continuar assim mesmo
                          </Button>
                        </div>
                      </div>
                      <img
                        src="https://via.placeholder.com/100x60"
                        alt="Ilustração"
                        className="w-24 h-auto"
                      />
                    </div>
                  </div>
                  
                  {/* Ativar no Catálogo */}
                  <div className="bg-white rounded-lg border p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          Disponibilizar no Catálogo
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Tornar este produto visível para licenciados
                        </p>
                      </div>
                      <Switch
                        checked={formData.catalog_active}
                        onCheckedChange={(checked) => handleInputChange('catalog_active', checked)}
                        className="data-[state=checked]:bg-green-600"
                      />
                    </div>
                  </div>
                </div>
              )}
              
            </form>
          </div>
        </div>
      </div>
      
      {/* Modal de Gerenciar Categorias */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Gerencie suas categorias</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  As categorias que os produtos serão exibidas na tela inicial do seu catálogo
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                  setNewCategoryName('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Insira a categoria que você deseja criar"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                />
                <Button
                  onClick={handleCreateCategory}
                  className="bg-pink-600 hover:bg-pink-700 text-white"
                  disabled={!newCategoryName.trim()}
                >
                  {editingCategory ? 'Salvar' : 'Criar'}
                </Button>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Estas são suas categorias
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {categories.map(category => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <span className="text-sm text-gray-900 font-medium uppercase">
                        {category.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingCategory(category);
                            setNewCategoryName(category.name);
                          }}
                          className="text-pink-600 hover:text-pink-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Gerenciar Subcategorias */}
      {showSubcategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Gerencie suas subcategorias</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  As subcategorias serão vistas por seus clientes na tela inicial do seu catálogo abaixo das categorias pais. Os clientes poderão filtrar os produtos por meio dessas subcategorias.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSubcategoryModal(false);
                  setEditingSubcategory(null);
                  setNewSubcategoryName('');
                  setSelectedParentForSub('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              <div>
                <Label className="text-sm text-gray-700 mb-1.5 block">Categoria pai:</Label>
                <select
                  value={selectedParentForSub}
                  onChange={(e) => setSelectedParentForSub(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md bg-white text-sm"
                >
                  <option value="">Selecione a categoria pai</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  placeholder="Insira a subcategoria que você deseja criar"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateSubcategory();
                    }
                  }}
                />
                <Button
                  onClick={handleCreateSubcategory}
                  className="bg-pink-600 hover:bg-pink-700 text-white"
                  disabled={!newSubcategoryName.trim() || !selectedParentForSub}
                >
                  {editingSubcategory ? 'Salvar' : 'Criar'}
                </Button>
              </div>
              
              {selectedParentForSub && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Estas são subcategorias cadastradas para a categoria pai selecionada
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {subcategories
                      .filter(sub => sub.parent_category_id === selectedParentForSub)
                      .map(subcategory => (
                        <div
                          key={subcategory.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <span className="text-sm text-gray-900 font-medium uppercase">
                            {subcategory.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingSubcategory(subcategory);
                                setNewSubcategoryName(subcategory.name);
                                setSelectedParentForSub(subcategory.parent_category_id);
                              }}
                              className="text-pink-600 hover:text-pink-700"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubcategory(subcategory.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}