import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Users, UserPlus, Search, Filter, Mail, Phone,
  DollarSign, TrendingUp, Edit, Trash2, X, Save, Send, UserCheck, UserX
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CRM() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [sellers, setSellers] = useState([]);
  const [allSellers, setAllSellers] = useState([]);
  const [editingSeller, setEditingSeller] = useState(null);
  const [activeTab, setActiveTab] = useState('customers');
  const [sellerFormData, setSellerFormData] = useState({
    name: '',
    phone: '',
    email: '',
    is_active: true
  });
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cpf: '',
    status: 'lead',
    source: 'site',
    notes: '',
    address_street: '',
    address_number: '',
    address_city: '',
    address_state: '',
    address_zip_code: '',
    last_contact: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      if (user.role !== 'admin') {
        alert("❌ Acesso negado! Apenas administradores.");
        navigate(createPageUrl('Home'));
        return;
      }
    }
    loadCustomers();
    loadSellers();
  }, [navigate]);

  const loadSellers = async () => {
    try {
      const activeSellers = await base44.entities.Seller.filter({ is_active: true });
      setSellers(activeSellers);
      
      const all = await base44.entities.Seller.list('-created_date', 100);
      setAllSellers(all);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const data = await base44.entities.Customer.list('-created_date', 500);
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      alert('❌ Erro ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = customers;

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter(c => c.source === sourceFilter);
    }

    setFilteredCustomers(filtered);
  }, [searchTerm, statusFilter, sourceFilter, customers]);

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      full_name: customer.full_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      cpf: customer.cpf || '',
      status: customer.status || 'lead',
      source: customer.source || 'site',
      notes: customer.notes || '',
      address_street: customer.address_street || '',
      address_number: customer.address_number || '',
      address_city: customer.address_city || '',
      address_state: customer.address_state || '',
      address_zip_code: customer.address_zip_code || '',
      last_contact: customer.last_contact || new Date().toISOString().split('T')[0]
    });
    setShowAddForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await base44.entities.Customer.update(editingCustomer.id, formData);
        alert('✅ Cliente atualizado!');
      } else {
        await base44.entities.Customer.create(formData);
        alert('✅ Cliente cadastrado!');
      }

      setFormData({
        full_name: '',
        email: '',
        phone: '',
        cpf: '',
        status: 'lead',
        source: 'site',
        notes: '',
        address_street: '',
        address_number: '',
        address_city: '',
        address_state: '',
        address_zip_code: '',
        last_contact: new Date().toISOString().split('T')[0]
      });
      setShowAddForm(false);
      setEditingCustomer(null);
      await loadCustomers();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro ao salvar cliente');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      await base44.entities.Customer.delete(id);
      alert('✅ Cliente excluído!');
      await loadCustomers();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('❌ Erro ao excluir cliente');
    }
  };

  const handleForward = (customer) => {
    setSelectedCustomer(customer);
    setShowForwardModal(true);
  };

  const handleEditSeller = (seller) => {
    setEditingSeller(seller);
    setSellerFormData({
      name: seller.name,
      phone: seller.phone,
      email: seller.email || '',
      is_active: seller.is_active
    });
    setShowSellerModal(true);
  };

  const handleToggleSellerStatus = async (seller) => {
    try {
      await base44.entities.Seller.update(seller.id, {
        is_active: !seller.is_active
      });
      alert(`✅ Vendedor ${!seller.is_active ? 'ativado' : 'desativado'}!`);
      await loadSellers();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('❌ Erro ao atualizar status');
    }
  };

  const handleSaveSeller = async (e) => {
    e.preventDefault();
    try {
      if (editingSeller) {
        await base44.entities.Seller.update(editingSeller.id, sellerFormData);
        alert('✅ Vendedor atualizado!');
      } else {
        await base44.entities.Seller.create(sellerFormData);
        alert('✅ Vendedor cadastrado!');
      }
      setSellerFormData({
        name: '',
        phone: '',
        email: '',
        is_active: true
      });
      setShowSellerModal(false);
      setEditingSeller(null);
      await loadSellers();
    } catch (error) {
      console.error('Erro ao salvar vendedor:', error);
      alert('❌ Erro ao salvar vendedor');
    }
  };

  const sendToWhatsApp = async () => {
    if (!selectedSeller) {
      alert('Selecione um vendedor!');
      return;
    }

    const seller = sellers.find(s => s.name === selectedSeller);
    const customer = selectedCustomer;

    // Salva o vendedor no cliente
    try {
      await base44.entities.Customer.update(customer.id, {
        assigned_seller: selectedSeller
      });
    } catch (error) {
      console.error('Erro ao atualizar vendedor:', error);
    }

    const statusText = customer.status === 'lead' ? 'Lead' : customer.status === 'cliente' ? 'Cliente' : 'Inativo';

    const message = `*NOVO LEAD - LEILÃO NOZAP*
━━━━━━━━━━━━━━━━━━━━

*DADOS DO CLIENTE*

*Nome:* ${customer.full_name}
*Email:* ${customer.email || 'Não informado'}
*Telefone:* ${customer.phone || 'Não informado'}
*CPF:* ${customer.cpf || 'Não informado'}

━━━━━━━━━━━━━━━━━━━━

*INFORMAÇÕES*

*Status:* ${statusText}
*Origem:* ${customer.source || 'Não informado'}
*Último Contato:* ${customer.last_contact ? new Date(customer.last_contact).toLocaleDateString('pt-BR') : 'Não informado'}

━━━━━━━━━━━━━━━━━━━━

*ENDEREÇO*

${customer.address_street ? `Rua: ${customer.address_street}, ${customer.address_number || 'S/N'}` : 'Rua: Não informado'}
${customer.address_city && customer.address_state ? `Cidade: ${customer.address_city} - ${customer.address_state}` : 'Cidade: Não informado'}
CEP: ${customer.address_zip_code || 'Não informado'}

━━━━━━━━━━━━━━━━━━━━

*Gasto Total:* R$ ${(customer.total_spent || 0).toFixed(2)}

${customer.notes ? `━━━━━━━━━━━━━━━━━━━━

*OBSERVAÇÕES*

${customer.notes}

━━━━━━━━━━━━━━━━━━━━` : ''}

_Entre em contato o mais rápido possível!_

_Enviado via CRM Leilão NoZap_`;

    const whatsappUrl = `https://wa.me/${seller.phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    setShowForwardModal(false);
    setSelectedSeller('');
    setSelectedCustomer(null);
    await loadCustomers();
  };

  const stats = {
    total: customers.length,
    leads: customers.filter(c => c.status === 'lead').length,
    clientes: customers.filter(c => c.status === 'cliente').length,
    totalSpent: customers.reduce((sum, c) => sum + (c.total_spent || 0), 0)
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'lead': return 'bg-yellow-100 text-yellow-800';
      case 'cliente': return 'bg-green-100 text-green-800';
      case 'inativo': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceColor = (source) => {
    switch (source) {
      case 'site': return 'bg-blue-100 text-blue-800';
      case 'indicacao': return 'bg-purple-100 text-purple-800';
      case 'whatsapp': return 'bg-green-100 text-green-800';
      case 'redes_sociais': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-[1800px] mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">CRM - Gestão de Clientes</h1>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowSellerModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Vendedor
            </Button>
            <Button
              onClick={() => {
                setEditingCustomer(null);
                setFormData({
                  full_name: '',
                  email: '',
                  phone: '',
                  cpf: '',
                  status: 'lead',
                  source: 'site',
                  notes: '',
                  address_street: '',
                  address_number: '',
                  address_city: '',
                  address_state: '',
                  address_zip_code: '',
                  last_contact: new Date().toISOString().split('T')[0]
                });
                setShowAddForm(true);
              }}
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* ESTATÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total de Contatos</p>
                  <p className="text-3xl font-bold text-white">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Leads</p>
                  <p className="text-3xl font-bold text-white">{stats.leads}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Clientes Ativos</p>
                  <p className="text-3xl font-bold text-white">{stats.clientes}</p>
                </div>
                <Users className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Faturamento Total</p>
                  <p className="text-2xl font-bold text-white">
                    R$ {stats.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="customers" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              Clientes
            </TabsTrigger>
            <TabsTrigger value="sellers" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Vendedores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers">
            {/* FILTROS DE CLIENTES */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white text-gray-900 border-gray-300"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white text-gray-900 rounded-md px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os Status</option>
            <option value="lead">Leads</option>
            <option value="cliente">Clientes</option>
            <option value="inativo">Inativos</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-white text-gray-900 rounded-md px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas as Origens</option>
            <option value="site">Site</option>
            <option value="indicacao">Indicação</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="redes_sociais">Redes Sociais</option>
            <option value="outro">Outro</option>
          </select>

          <Button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setSourceFilter('all');
            }}
            variant="outline"
            className="bg-white border-gray-300 text-gray-900 hover:bg-gray-100"
          >
            <Filter className="w-4 h-4 mr-2" />
            Limpar Filtros
          </Button>
          </div>

          {/* LISTA DE CLIENTES */}
          <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">
              Clientes ({filteredCustomers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-800">
                    <th className="text-left p-3 font-semibold text-white">Nome</th>
                    <th className="text-left p-3 font-semibold text-white">Email</th>
                    <th className="text-left p-3 font-semibold text-white">Telefone</th>
                    <th className="text-center p-3 font-semibold text-white">Status</th>
                    <th className="text-center p-3 font-semibold text-white">Status da Compra</th>
                    <th className="text-center p-3 font-semibold text-white">Origem</th>
                    <th className="text-center p-3 font-semibold text-white">Vendedor</th>
                    <th className="text-center p-3 font-semibold text-white">Último Contato</th>
                    <th className="text-right p-3 font-semibold text-white">Gasto Total</th>
                    <th className="text-center p-3 font-semibold text-white">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer, index) => (
                    <tr
                      key={customer.id}
                      onClick={() => navigate(createPageUrl('CustomerDetails') + `?id=${customer.id}`)}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="p-3 text-gray-900 font-medium">{customer.full_name}</td>
                      <td className="p-3 text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {customer.email || '-'}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {customer.phone || '-'}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={getStatusColor(customer.status)}>
                          {customer.status === 'lead' ? 'Lead' : customer.status === 'cliente' ? 'Cliente' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={getPurchaseStatusColor(customer.purchase_status || 'sem_compra')}>
                          {getPurchaseStatusLabel(customer.purchase_status || 'sem_compra')}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={getSourceColor(customer.source)}>
                          {customer.source || '-'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center text-gray-600">
                        {customer.assigned_seller || '-'}
                      </td>
                      <td className="p-3 text-center text-gray-600">
                        {customer.last_contact ? new Date(customer.last_contact).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="p-3 text-right text-green-600 font-bold">
                        R$ {(customer.total_spent || 0).toFixed(2)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleForward(customer);
                            }}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Encaminhar para Vendedor"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(customer.id);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredCustomers.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum cliente encontrado</p>
                </div>
              )}
            </div>
          </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sellers">
            {/* LISTA DE VENDEDORES */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">
                  Vendedores Cadastrados ({allSellers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 bg-gray-800">
                        <th className="text-left p-3 font-semibold text-white">Nome</th>
                        <th className="text-left p-3 font-semibold text-white">Telefone</th>
                        <th className="text-left p-3 font-semibold text-white">Email</th>
                        <th className="text-center p-3 font-semibold text-white">Status</th>
                        <th className="text-center p-3 font-semibold text-white">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allSellers.map((seller, index) => (
                        <tr
                          key={seller.id}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="p-3 text-gray-900 font-medium">{seller.name}</td>
                          <td className="p-3 text-gray-600">
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {seller.phone}
                            </div>
                          </td>
                          <td className="p-3 text-gray-600">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {seller.email || '-'}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={seller.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {seller.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditSeller(seller)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleSellerStatus(seller)}
                                className={seller.is_active ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}
                                title={seller.is_active ? 'Desativar' : 'Ativar'}
                              >
                                {seller.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {allSellers.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum vendedor cadastrado</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* MODAL DE CADASTRO DE VENDEDOR */}
        {showSellerModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="bg-gray-800 border-gray-700 max-w-md w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">
                    {editingSeller ? '✏️ Editar Vendedor' : '➕ Novo Vendedor'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowSellerModal(false);
                      setEditingSeller(null);
                      setSellerFormData({
                        name: '',
                        phone: '',
                        email: '',
                        is_active: true
                      });
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSeller} className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Nome do Vendedor *</Label>
                    <Input
                      value={sellerFormData.name}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, name: e.target.value })}
                      className="bg-gray-700 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Telefone (com código do país) *</Label>
                    <Input
                      value={sellerFormData.phone}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, phone: e.target.value })}
                      className="bg-gray-700 text-white"
                      placeholder="Ex: 5521999999999"
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">Formato: código do país + DDD + número</p>
                  </div>

                  <div>
                    <Label className="text-gray-300">Email</Label>
                    <Input
                      type="email"
                      value={sellerFormData.email}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, email: e.target.value })}
                      className="bg-gray-700 text-white"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                      <Save className="w-4 h-4 mr-2" />
                      {editingSeller ? 'Atualizar' : 'Salvar'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowSellerModal(false);
                        setEditingSeller(null);
                        setSellerFormData({
                          name: '',
                          phone: '',
                          email: '',
                          is_active: true
                        });
                      }}
                      className="border-gray-600 text-gray-300"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODAL DE ENCAMINHAR PARA VENDEDOR */}
        {showForwardModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="bg-gray-800 border-gray-700 max-w-md w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">📲 Encaminhar para Vendedor</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowForwardModal(false);
                      setSelectedSeller('');
                      setSelectedCustomer(null);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-300 mb-2 block">Cliente Selecionado:</Label>
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <p className="text-white font-semibold">{selectedCustomer?.full_name}</p>
                    <p className="text-gray-400 text-sm">{selectedCustomer?.email}</p>
                    <p className="text-gray-400 text-sm">{selectedCustomer?.phone}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Selecione o Vendedor:</Label>
                  <select
                    value={selectedSeller}
                    onChange={(e) => setSelectedSeller(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-md px-4 py-2 border border-gray-600"
                  >
                    <option value="">-- Selecione --</option>
                    {sellers.map((seller, index) => (
                      <option key={index} value={seller.name}>
                        {seller.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={sendToWhatsApp}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={!selectedSeller}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar via WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForwardModal(false);
                      setSelectedSeller('');
                      setSelectedCustomer(null);
                    }}
                    className="border-gray-600 text-gray-300"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODAL DE FORMULÁRIO */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <Card className="bg-gray-800 border-gray-700 max-w-4xl w-full my-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">
                    {editingCustomer ? '✏️ Editar Cliente' : '➕ Novo Cliente'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingCustomer(null);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Nome Completo *</Label>
                      <Input
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="bg-gray-700 text-white"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Email</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="bg-gray-700 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Telefone</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="bg-gray-700 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">CPF</Label>
                      <Input
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                        className="bg-gray-700 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Status</Label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded-md px-4 py-2 border border-gray-600"
                      >
                        <option value="lead">Lead</option>
                        <option value="cliente">Cliente</option>
                        <option value="inativo">Inativo</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-gray-300">Origem</Label>
                      <select
                        value={formData.source}
                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded-md px-4 py-2 border border-gray-600"
                      >
                        <option value="site">Site</option>
                        <option value="indicacao">Indicação</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="redes_sociais">Redes Sociais</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-gray-300">Último Contato</Label>
                      <Input
                        type="date"
                        value={formData.last_contact}
                        onChange={(e) => setFormData({ ...formData, last_contact: e.target.value })}
                        className="bg-gray-700 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">CEP</Label>
                      <Input
                        value={formData.address_zip_code}
                        onChange={(e) => setFormData({ ...formData, address_zip_code: e.target.value })}
                        className="bg-gray-700 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Endereço</Label>
                      <Input
                        value={formData.address_street}
                        onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                        className="bg-gray-700 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Número</Label>
                      <Input
                        value={formData.address_number}
                        onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                        className="bg-gray-700 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Cidade</Label>
                      <Input
                        value={formData.address_city}
                        onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                        className="bg-gray-700 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Estado</Label>
                      <Input
                        value={formData.address_state}
                        onChange={(e) => setFormData({ ...formData, address_state: e.target.value })}
                        className="bg-gray-700 text-white"
                      />
                    </div>

                    <div className="col-span-full">
                      <Label className="text-gray-300">Observações</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="bg-gray-700 text-white"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      <Save className="w-4 h-4 mr-2" />
                      {editingCustomer ? 'Atualizar' : 'Salvar'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingCustomer(null);
                      }}
                      className="border-gray-600 text-gray-300"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}