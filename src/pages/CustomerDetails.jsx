import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import NegotiationModal from '@/components/crm/NegotiationModal';
import NegotiationsList from '@/components/crm/NegotiationsList';
import {
  ArrowLeft, Save, Mail, Phone, MapPin, Calendar,
  User, ShoppingCart, TrendingUp, CheckCircle, Clock, Search, Package, Briefcase
} from 'lucide-react';

export default function CustomerDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [products, setProducts] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [negotiations, setNegotiations] = useState([]);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [sellers, setSellers] = useState([]);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const customerId = urlParams.get('id');

    if (!customerId) {
      navigate(createPageUrl('CRM'));
      return;
    }

    loadCustomer(customerId);
    loadProducts();
    loadNegotiations(customerId);
    loadSellers();
  }, [location]);

  const loadNegotiations = async (customerId) => {
    try {
      const data = await base44.entities.Negotiation.filter({ customer_id: customerId });
      setNegotiations(data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error('Erro ao carregar negociações:', error);
    }
  };

  const loadSellers = async () => {
    try {
      const data = await base44.entities.Seller.filter({ is_active: true });
      setSellers(data);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const allProducts = await base44.entities.Product.list('-created_date', 500);
      // Filtra apenas produtos com estoque disponível
      const inStock = allProducts.filter(p => (p.quantity || 0) > 0);
      setProducts(inStock);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const loadCustomer = async (id) => {
    try {
      setIsLoading(true);
      const customers = await base44.entities.Customer.filter({ id });
      
      if (customers.length === 0) {
        navigate(createPageUrl('CRM'));
        return;
      }

      const customerData = customers[0];
      setCustomer(customerData);
      setFormData({
        full_name: customerData.full_name || '',
        email: customerData.email || '',
        phone: customerData.phone || '',
        cpf: customerData.cpf || '',
        status: customerData.status || 'lead',
        source: customerData.source || 'site',
        notes: customerData.notes || '',
        address_street: customerData.address_street || '',
        address_number: customerData.address_number || '',
        address_city: customerData.address_city || '',
        address_state: customerData.address_state || '',
        address_zip_code: customerData.address_zip_code || '',
        last_contact: customerData.last_contact || '',
        assigned_seller: customerData.assigned_seller || '',
        purchase_status: customerData.purchase_status || 'sem_compra',
        next_steps: customerData.next_steps || '',
        purchase_value: customerData.purchase_value || 0,
        purchase_product: customerData.purchase_product || '',
        follow_up_date: customerData.follow_up_date || ''
      });
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
      alert('❌ Erro ao carregar dados do cliente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await base44.entities.Customer.update(customer.id, formData);
      alert('✅ Dados salvos com sucesso!');
      await loadCustomer(customer.id);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro ao salvar dados');
    } finally {
      setIsSaving(false);
    }
  };

  const getPurchaseStatusColor = (status) => {
    switch (status) {
      case 'sem_compra': return 'bg-gray-100 text-gray-800';
      case 'em_negociacao': return 'bg-blue-100 text-blue-800';
      case 'aguardando_pagamento': return 'bg-yellow-100 text-yellow-800';
      case 'pago': return 'bg-green-100 text-green-800';
      case 'enviado': return 'bg-purple-100 text-purple-800';
      case 'entregue': return 'bg-emerald-100 text-emerald-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPurchaseStatusLabel = (status) => {
    const labels = {
      'sem_compra': 'Sem Compra',
      'em_negociacao': 'Em Negociação',
      'aguardando_pagamento': 'Aguardando Pagamento',
      'pago': 'Pago',
      'enviado': 'Enviado',
      'entregue': 'Entregue',
      'cancelado': 'Cancelado'
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-900">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6" onClick={() => setShowProductDropdown(false)}>
      <div className="max-w-5xl mx-auto" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('CRM'))}
              className="bg-white border-gray-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">{customer.full_name}</h1>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>

        {/* STATUS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Status do Cliente</p>
                  <Badge className={formData.status === 'cliente' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {formData.status === 'lead' ? 'Lead' : formData.status === 'cliente' ? 'Cliente' : 'Inativo'}
                  </Badge>
                </div>
                <User className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Status da Compra</p>
                  <Badge className={getPurchaseStatusColor(formData.purchase_status)}>
                    {getPurchaseStatusLabel(formData.purchase_status)}
                  </Badge>
                </div>
                <ShoppingCart className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Gasto Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    R$ {(customer.total_spent || 0).toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* INFORMAÇÕES PESSOAIS */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-700">Nome Completo</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="bg-white text-gray-900"
                />
              </div>

              <div>
                <Label className="text-gray-700">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-white text-gray-900"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-700">Telefone</Label>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-white text-gray-900"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-700">CPF</Label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  className="bg-white text-gray-900"
                />
              </div>

              <div>
                <Label className="text-gray-700">Status</Label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-white text-gray-900 rounded-md px-4 py-2 border border-gray-300"
                >
                  <option value="lead">Lead</option>
                  <option value="cliente">Cliente</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <div>
                <Label className="text-gray-700">Origem</Label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full bg-white text-gray-900 rounded-md px-4 py-2 border border-gray-300"
                >
                  <option value="site">Site</option>
                  <option value="indicacao">Indicação</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="redes_sociais">Redes Sociais</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <Label className="text-gray-700">Vendedor Responsável</Label>
                <Input
                  value={formData.assigned_seller}
                  onChange={(e) => setFormData({ ...formData, assigned_seller: e.target.value })}
                  className="bg-white text-gray-900"
                />
              </div>
            </CardContent>
          </Card>

          {/* ENDEREÇO */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-700">CEP</Label>
                <Input
                  value={formData.address_zip_code}
                  onChange={(e) => setFormData({ ...formData, address_zip_code: e.target.value })}
                  className="bg-white text-gray-900"
                />
              </div>

              <div>
                <Label className="text-gray-700">Rua</Label>
                <Input
                  value={formData.address_street}
                  onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                  className="bg-white text-gray-900"
                />
              </div>

              <div>
                <Label className="text-gray-700">Número</Label>
                <Input
                  value={formData.address_number}
                  onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                  className="bg-white text-gray-900"
                />
              </div>

              <div>
                <Label className="text-gray-700">Cidade</Label>
                <Input
                  value={formData.address_city}
                  onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                  className="bg-white text-gray-900"
                />
              </div>

              <div>
                <Label className="text-gray-700">Estado</Label>
                <Input
                  value={formData.address_state}
                  onChange={(e) => setFormData({ ...formData, address_state: e.target.value })}
                  className="bg-white text-gray-900"
                  maxLength={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* STATUS DA COMPRA */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Status da Compra
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-700">Status Atual</Label>
                <select
                  value={formData.purchase_status}
                  onChange={(e) => setFormData({ ...formData, purchase_status: e.target.value })}
                  className="w-full bg-white text-gray-900 rounded-md px-4 py-2 border border-gray-300"
                >
                  <option value="sem_compra">Sem Compra</option>
                  <option value="em_negociacao">Em Negociação</option>
                  <option value="aguardando_pagamento">Aguardando Pagamento</option>
                  <option value="pago">Pago</option>
                  <option value="enviado">Enviado</option>
                  <option value="entregue">Entregue</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="relative">
                <Label className="text-gray-700">Produto em Negociação</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={formData.purchase_product}
                    onChange={(e) => {
                      setFormData({ ...formData, purchase_product: e.target.value });
                      setProductSearchTerm(e.target.value);
                      setShowProductDropdown(e.target.value.length > 0);
                    }}
                    onFocus={() => setShowProductDropdown(formData.purchase_product.length > 0)}
                    className="bg-white text-gray-900 pl-10"
                    placeholder="Ex: Geladeira Frost Free 400L"
                  />
                </div>
                
                {showProductDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {products
                      .filter(p => 
                        p.description?.toLowerCase().includes((formData.purchase_product || '').toLowerCase()) ||
                        p.lot?.toLowerCase().includes((formData.purchase_product || '').toLowerCase())
                      )
                      .slice(0, 10)
                      .map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setFormData({ 
                              ...formData, 
                              purchase_product: product.description,
                              purchase_value: product.selling_price_retail || product.cost_price || 0
                            });
                            setShowProductDropdown(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b border-gray-100 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <Package className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{product.description}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                                <span>Lote: {product.lot || 'N/A'}</span>
                                <span>•</span>
                                <span className="text-green-600 font-bold">Estoque: {product.quantity || 0}</span>
                                {product.selling_price_retail && (
                                  <>
                                    <span>•</span>
                                    <span>R$ {product.selling_price_retail.toFixed(2)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    }
                    {products.filter(p => 
                      p.description?.toLowerCase().includes((formData.purchase_product || '').toLowerCase()) ||
                      p.lot?.toLowerCase().includes((formData.purchase_product || '').toLowerCase())
                    ).length === 0 && (
                      <div className="px-4 py-8 text-center text-gray-400">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhum produto encontrado em estoque</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-gray-700">Valor da Compra</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.purchase_value}
                  onChange={(e) => setFormData({ ...formData, purchase_value: parseFloat(e.target.value) || 0 })}
                  className="bg-white text-gray-900"
                />
              </div>
            </CardContent>
          </Card>

          {/* PRÓXIMOS PASSOS */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Próximos Passos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-700">Ações Planejadas</Label>
                <Textarea
                  value={formData.next_steps}
                  onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
                  className="bg-white text-gray-900"
                  rows={5}
                  placeholder="Ex: 1. Enviar proposta por email&#10;2. Ligar para confirmar interesse&#10;3. Agendar visita"
                />
              </div>

              <div>
                <Label className="text-gray-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data de Follow-up
                </Label>
                <Input
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                  className="bg-white text-gray-900"
                  placeholder="dd/mm/aaaa"
                />
              </div>

              <div>
                <Label className="text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Último Contato
                </Label>
                <Input
                  type="date"
                  value={formData.last_contact}
                  onChange={(e) => setFormData({ ...formData, last_contact: e.target.value })}
                  className="bg-white text-gray-900"
                  placeholder="dd/mm/aaaa"
                />
              </div>
            </CardContent>
          </Card>

          {/* OBSERVAÇÕES */}
          <Card className="bg-white border-gray-200 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-gray-900">Observações Gerais</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-white text-gray-900"
                rows={6}
                placeholder="Anotações importantes sobre o cliente..."
              />
            </CardContent>
          </Card>

          {/* PRODUTOS DE INTERESSE */}
          {customer.interested_products && customer.interested_products.length > 0 && (
            <Card className="bg-blue-50 border-blue-200 lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Produtos de Interesse
                  </CardTitle>
                  <Button
                    onClick={() => setShowNegotiationModal(true)}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Criar Negociação
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {customer.interested_products.map(p => (
                    <Badge key={p.product_id} className="bg-blue-600 text-white px-3 py-1">
                      {p.product_name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* NEGOCIAÇÕES */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-orange-600" />
                Negociações
              </h2>
              <Button
                onClick={() => setShowNegotiationModal(true)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Nova Negociação
              </Button>
            </div>
            <NegotiationsList 
              negotiations={negotiations}
              onNegotiationClick={(neg) => {
                console.log('Negociação clicada:', neg);
              }}
            />
          </div>
        </div>

        {/* MODAL DE NEGOCIAÇÃO */}
        {showNegotiationModal && (
          <NegotiationModal
            customer={customer}
            sellers={sellers}
            onClose={() => setShowNegotiationModal(false)}
            onSave={() => {
              loadNegotiations(customer.id);
              loadCustomer(customer.id);
            }}
          />
        )}

        {/* BOTÃO SALVAR INFERIOR */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white px-8"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Todas as Alterações'}
          </Button>
        </div>
      </div>
    </div>
  );
}