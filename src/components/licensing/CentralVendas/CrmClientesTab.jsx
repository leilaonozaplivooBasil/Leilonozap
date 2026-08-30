import React, { useState, useEffect } from 'react';
import { fmtBR } from '@/lib/money';
import { plataforma } from '@/api/plataformaClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Users, UserPlus, Search, Filter, Mail, Phone,
  DollarSign, TrendingUp, Edit, Trash2, X, Save, Send, UserCheck, UserX,
  ShoppingCart, MessageSquare, Clock, CheckCircle, Package, Truck, XCircle, Briefcase,
  Pencil, Plus, RefreshCw, TriangleAlert, ShieldAlert
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { buildUnifiedCustomers, getNetworkDescendantIds, ROLE_LABEL } from '@/lib/crmUnifiedCustomers';
import { isVendaReal } from '@/lib/dinheiroReal';
import CrmStatsCards from './CrmStatsCards';
import CrmCustomersTable from './CrmCustomersTable';
import CrmCustomerDetailModal from './CrmCustomerDetailModal';

// 🧭 CRM realocado (18/08/2026): antes era a página standalone /CRM (acesso só
// admin, com header próprio). Agora vive como seção dentro de Central de
// Vendas no Painel de Alavancagem — mesmos dados, mesma lógica, só o local
// mudou. O controle de acesso (admin/super_admin) passa a vir de fora (prop
// isAdmin), já que aqui dentro não faz sentido "navegar pra Home".
// 🔄 Fontes automáticas (18/08/2026): a lista de clientes agora soma indicados
// (AppUser.referred_by_id) e compradores da Loja Virtual (CatalogSale.licensee_id)
// junto com o cadastro manual — ver src/lib/crmUnifiedCustomers.js.
export default function CrmClientesTab({ isAdmin, currentUser }) {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState('all');
  const [roleTypeFilter, setRoleTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [sellers, setSellers] = useState([]);
  const [allSellers, setAllSellers] = useState([]);
  const [editingSeller, setEditingSeller] = useState(null);
  const [activeTab, setActiveTab] = useState('customers');
  const [negotiations, setNegotiations] = useState([]);
  const [sellerFormData, setSellerFormData] = useState({
    name: '',
    phone: '',
    email: '',
    license_type: '',
    default_commission_percentage: 0,
    default_licenciante_commission_percentage: 0,
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
    last_contact: new Date().toISOString().split('T')[0],
    interested_products: []
  });
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Fontes automáticas — visão ADMIN completa: todos os usuários, todas as
  // vendas da Loja Virtual e todos os arremates de Leilões da plataforma.
  const [appUsers, setAppUsers] = useState([]);
  const [catalogSales, setCatalogSales] = useState([]);
  const [auctions, setAuctions] = useState([]);
  // 🔴 DIR-10 — "Faturamento Total" somava o valor CHEIO de cada venda/arremate
  // (total_spent), o mesmo erro de conceito já corrigido no Financeiro (DIR-7):
  // isso é volume transacionado pelos clientes, não dinheiro que a empresa
  // ficou — a maior parte vai pro vendedor terceiro. O dono reportou "não
  // faturamos 3 milhões", e tinha razão. financial_income é o livro-razão
  // real (só comissão + taxa sem repasse) já usado no módulo Financeiro —
  // mesma fonte, mesmo número, em vez de recalcular errado aqui de novo.
  const [financialIncome, setFinancialIncome] = useState([]);

  const loadAutoSources = async () => {
    try {
      const [users, sales, auctionsList, income] = await Promise.all([
        plataforma.entities.AppUser.list('-created_date', 5000),
        // 🔒 DIR-17 — mesma busca do Painel de Alavancagem (NetworkOverview.jsx),
        // parâmetro por parâmetro: telas que somam o mesmo dinheiro precisam ler
        // as MESMAS linhas, senão divergem por truncamento e não por lógica.
        plataforma.entities.CatalogSale.list('-created_date', 5000),
        plataforma.entities.Auction.list('-end_time', 2000),
        plataforma.entities.FinancialIncome.list('-received_date', 5000),
      ]);
      setAppUsers(Array.isArray(users) ? users : []);
      setCatalogSales(Array.isArray(sales) ? sales : []);
      setAuctions(Array.isArray(auctionsList) ? auctionsList.filter((a) => !!a.winner_id) : []);
      setFinancialIncome(Array.isArray(income) ? income : []);
    } catch (error) {
      console.error('Erro ao carregar fontes automáticas do CRM:', error);
    }
  };

  useEffect(() => {
    if (!isAdmin) { setIsLoading(false); return; }
    loadCustomers();
    loadSellers();
    loadNegotiations();
    loadProducts();
    loadAutoSources();
  }, [isAdmin]);

  // 🌳 ESCOPO DE REDE — "de mim para baixo": nunca a base inteira do app... a
  // menos que quem está olhando seja o super_admin. DIR-10 (27/08/2026), pedido
  // explícito do dono: um licenciado/vendedor precisa ver só a própria rede de
  // indicados (senão o CRM vira uma lista de clientes de todo mundo, inútil pra
  // ele); o super_admin precisa ver o negócio inteiro circulando entre todas as
  // estruturas, sem filtro nenhum — visão clara de tudo.
  // A árvore é construída com TODOS os usuários (precisa do grafo completo pra
  // achar sub-indicados), mas só entram na lista os IDs dentro da minha rede.
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const networkIds = React.useMemo(
    () => (!isSuperAdmin && currentUser?.id ? getNetworkDescendantIds(appUsers, currentUser.id) : new Set()),
    [appUsers, currentUser?.id, isSuperAdmin]
  );
  const networkAppUsers = React.useMemo(
    () => (isSuperAdmin ? appUsers : appUsers.filter((u) => networkIds.has(u.id))),
    [appUsers, networkIds, isSuperAdmin]
  );
  // 🔴 DIR-10 — o "dono" de uma venda não vive só em licensee_id: dependendo do
  // canal (loja própria de licenciado, carrinho do site, PDV), fica gravado em
  // seller_id/anchor_id/owner_id (mesma constatação já feita em LicenseeOrders.jsx).
  // Olhar só licensee_id fazia a rede inteira ficar sem nenhuma venda, mesmo real.
  const networkCatalogSales = React.useMemo(
    () => (isSuperAdmin ? catalogSales : catalogSales.filter((s) =>
      [s.licensee_id, s.anchor_id, s.seller_id, s.owner_id].some((id) => id === currentUser?.id || networkIds.has(id))
    )),
    [catalogSales, networkIds, currentUser?.id, isSuperAdmin]
  );
  const networkAuctions = React.useMemo(
    () => (isSuperAdmin ? auctions : auctions.filter((a) => networkIds.has(a.winner_id))),
    [auctions, networkIds, isSuperAdmin]
  );

  // Lista unificada: indicados + compras da Loja Virtual + cadastro manual (deduplicados)
  const unifiedCustomers = React.useMemo(
    () => buildUnifiedCustomers({ appUsers: networkAppUsers, catalogSales: networkCatalogSales, auctions: networkAuctions, manualCustomers: customers }),
    [networkAppUsers, networkCatalogSales, networkAuctions, customers]
  );

  const [detailCustomer, setDetailCustomer] = useState(null);

  // Carregar produtos automaticamente ao abrir modal
  useEffect(() => {
    if (showAddForm && availableProducts.length === 0) {
      loadProducts();
    }
  }, [showAddForm]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      // 🔴 DIR-10 — pegava só os 500 produtos mais recentes por data de criação,
      // sem o mesmo filtro catalog_active usado na vitrine (Catalog.jsx). Com
      // milhares de linhas históricas (produto vendido, amostra, lote zerado), o
      // estoque real podia nunca estar entre os 500 mais novos e o card fechava
      // em zero mesmo havendo produto de verdade. Mesmo filtro do catálogo público.
      const data = await plataforma.entities.Product.filter({ catalog_active: true }, '-created_date', 5000);
      // Filtra produtos com estoque disponível (quantidade > 0)
      const inStock = (data || []).filter(p => {
        const qty = p.quantity || 0;
        return qty > 0;
      });
      setAvailableProducts(inStock);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      setAvailableProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // 🔴 DIR-10 — chamava /api/functions/adminDataProxy, uma função que nunca
  // existiu no servidor (404 sempre, "Volume em Negociação" sempre zero).
  // Negotiation já está mapeada no adapter (TABLE_MAP) como qualquer outra
  // entidade — mesmo caminho genérico usado por Customer/Seller/etc.
  const loadNegotiations = async () => {
    try {
      const data = await plataforma.entities.Negotiation.list('-created_date', 200);
      setNegotiations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar negociações:', error);
      setNegotiations([]);
    }
  };

  const loadSellers = async () => {
    try {
      const activeSellers = await plataforma.entities.Seller.filter({ is_active: true });
      setSellers(activeSellers);

      const all = await plataforma.entities.Seller.list('-created_date', 100);
      setAllSellers(all);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const data = await plataforma.entities.Customer.list('-created_date', 500);
      setCustomers(data || []);
      setFilteredCustomers(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      setCustomers([]);
      setFilteredCustomers([]);
      alert('Erro ao carregar clientes - tente novamente');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = unifiedCustomers;

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
      filtered = filtered.filter(c => (c.source || '').split('+').includes(sourceFilter));
    }

    if (purchaseStatusFilter !== 'all') {
      filtered = filtered.filter(c => (c.purchase_status || 'sem_compra') === purchaseStatusFilter);
    }

    if (roleTypeFilter !== 'all') {
      filtered = filtered.filter(c => c.role_type === roleTypeFilter);
    }

    setFilteredCustomers(filtered);
  }, [searchTerm, statusFilter, sourceFilter, purchaseStatusFilter, roleTypeFilter, unifiedCustomers]);

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
      last_contact: customer.last_contact || new Date().toISOString().split('T')[0],
      interested_products: customer.interested_products || []
    });
    setShowAddForm(true);
  };

  const addInterestedProduct = (product) => {
    const exists = formData.interested_products.find(p => p.product_id === product.id);
    if (exists) {
      alert('Produto já adicionado!');
      return;
    }
    if (formData.interested_products.length >= 10) {
      alert('Máximo de 10 produtos!');
      return;
    }
    setFormData({
      ...formData,
      interested_products: [
        ...formData.interested_products,
        { product_id: product.id, product_name: product.description }
      ]
    });
    setProductSearchTerm('');
  };

  const removeInterestedProduct = (productId) => {
    setFormData({
      ...formData,
      interested_products: formData.interested_products.filter(p => p.product_id !== productId)
    });
  };

  const filteredProductsForModal = React.useMemo(() => {
    if (!productSearchTerm) return [];
    const search = productSearchTerm.toLowerCase().trim();
    return availableProducts.filter(p => {
      const desc = (p.description || '').toLowerCase();
      const lot = (p.lot || '').toLowerCase();
      return desc.includes(search) || lot.includes(search);
    });
  }, [productSearchTerm, availableProducts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await plataforma.entities.Customer.update(editingCustomer.id, formData);
        alert('Cliente atualizado!');
      } else {
        await plataforma.entities.Customer.create(formData);
        alert('Cliente cadastrado!');
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
        last_contact: new Date().toISOString().split('T')[0],
        interested_products: []
      });
      setShowAddForm(false);
      setEditingCustomer(null);
      setShowProductSearch(false);
      setProductSearchTerm('');
      await loadCustomers();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar cliente');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      await plataforma.entities.Customer.delete(id);
      alert('Cliente excluído!');
      await loadCustomers();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir cliente');
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
      license_type: seller.license_type || '',
      default_commission_percentage: seller.default_commission_percentage || 0,
      default_licenciante_commission_percentage: seller.default_licenciante_commission_percentage || 0,
      is_active: seller.is_active
    });
    setShowSellerModal(true);
  };

  const handleToggleSellerStatus = async (seller) => {
    try {
      await plataforma.entities.Seller.update(seller.id, {
        is_active: !seller.is_active
      });
      alert(`Vendedor ${!seller.is_active ? 'ativado' : 'desativado'}!`);
      await loadSellers();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status');
    }
  };

  const handleSaveSeller = async (e) => {
    e.preventDefault();
    try {
      if (editingSeller) {
        await plataforma.entities.Seller.update(editingSeller.id, sellerFormData);
        alert('Vendedor atualizado!');
      } else {
        await plataforma.entities.Seller.create(sellerFormData);
        alert('Vendedor cadastrado!');
      }
      setSellerFormData({
        name: '',
        phone: '',
        email: '',
        license_type: '',
        default_commission_percentage: 0,
        default_licenciante_commission_percentage: 0,
        is_active: true
      });
      setShowSellerModal(false);
      setEditingSeller(null);
      await loadSellers();
    } catch (error) {
      console.error('Erro ao salvar vendedor:', error);
      alert('Erro ao salvar vendedor');
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
      await plataforma.entities.Customer.update(customer.id, {
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

*Gasto Total:* R$ ${fmtBR((customer.total_spent || 0))}

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

  // 💰 DIR-14/DIR-15 (30/08/2026) — histórico de 3 tentativas erradas antes
  // desta, cada uma com filtro caseiro diferente, nenhuma batendo com o
  // Painel de Alavancagem (NetworkOverview.jsx): primeiro contava depósito
  // pendente/cancelado; depois misturava depósito+adesão+passaporte na
  // "venda bruta" e somava leilão de Plano de Investimento (36 registros de
  // R$ 5.000, ~R$ 180 mil, que não são mercadoria); mesmo depois de tirar
  // isso, ainda sobrava venda de TESTE (pré-lançamento) e sem rastro de
  // gateway, porque nenhuma das versões usava o critério oficial.
  // Critério oficial (docs/MARCO-OFICIAL-AGOSTO-2026.md, seção 1): só é
  // dinheiro real quem está PAGO + tem RASTRO de gateway (ou pagamento por
  // saldo interno) + é a partir de 01/08/2026. Extraído pra
  // src/lib/dinheiroReal.js e agora é o MESMO filtro nas duas telas — não
  // dá mais pra divergir, porque é a mesma função.
  // wallet_deposit só (não soma operacao_deposit/commission_deposit aqui,
  // mesma decisão do Painel de Alavancagem — esse saldo já vira "compra"
  // quando é gasto, contado em comprasBrutas; somar os dois contaria o
  // mesmo real duas vezes).
  const depositosCarteira = networkCatalogSales
    .filter((s) => s.kind === 'wallet_deposit')
    .filter(isVendaReal)
    .reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const comprasBrutas = networkCatalogSales
    .filter((s) => ['loja', 'produto'].includes(s.kind))
    .filter(isVendaReal)
    .reduce((sum, s) => sum + (s.total_amount || 0), 0);
  // Leilão vem de catalog_sales (kind='arremate'), não da tabela auctions —
  // mesma fonte do Painel de Alavancagem. Isso evita de vez o problema do
  // Plano de Investimento (não gera venda kind='arremate' com rastro real)
  // e o problema de "arrematado mas não pago" (isVendaReal já exige status
  // pago + rastro/saldo — um winner_id sozinho na tabela auctions nunca
  // seria suficiente, é exatamente o que causava a inflação anterior).
  const leilaoBruto = networkCatalogSales
    .filter((s) => s.kind === 'arremate')
    .filter(isVendaReal)
    .reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const volumeVendasBruto = comprasBrutas + leilaoBruto;

  // 📋 Espelho do Painel de Alavancagem (30/08/2026) — pedido do dono: "insira
  // exatamente as informações que tem lá, não invente". Mesmas fórmulas,
  // literalmente copiadas de NetworkOverview.jsx (fetchFinanceStats +
  // conversion), só trocando `allUsers`/`financeStats` (a rede DELE) por
  // `networkAppUsers`/`networkCatalogSales` (a rede/plataforma de quem está
  // vendo o CRM) — pra super_admin isso já é a plataforma inteira. "Valor
  // total gerado" aqui é SÓ depósito + compra de Loja, igual ao Painel de
  // Alavancagem — não inclui leilão, de propósito, pra ser comparável
  // número a número, célula a célula.
  const depositsForConversao = networkCatalogSales.filter((s) => s.kind === 'wallet_deposit').filter(isVendaReal);
  const operacaoForConversao = networkCatalogSales.filter((s) => s.kind === 'operacao_deposit').filter(isVendaReal);
  const comprasForConversao = networkCatalogSales.filter((s) => ['loja', 'produto'].includes(s.kind)).filter(isVendaReal);
  const realSalesParaConversao = [...depositsForConversao, ...operacaoForConversao, ...comprasForConversao];
  const CONVERSAO_JANELA_DIAS = 30;
  const cutoff30d = new Date(Date.now() - CONVERSAO_JANELA_DIAS * 24 * 60 * 60 * 1000);
  const totalNaBase = networkAppUsers.length;
  const buyerIdsUnicos = new Set(realSalesParaConversao.map((s) => s.buyer_id).filter(Boolean));
  const novosUltimos30Dias = networkAppUsers.filter((u) => new Date(u.created_date) >= cutoff30d).length;
  const compradoresRecentesUnicos = new Set(
    realSalesParaConversao.filter((s) => new Date(s.created_date) >= cutoff30d).map((s) => s.buyer_id).filter(Boolean)
  );
  const espelhoPainelAlavancagem = {
    totalNaBase,
    novosUltimos30Dias,
    compradoresUnicos: buyerIdsUnicos.size,
    conversaoGeral: totalNaBase ? (buyerIdsUnicos.size / totalNaBase) * 100 : 0,
    compraramUltimos30Dias: compradoresRecentesUnicos.size,
    taxaRecente: novosUltimos30Dias ? (compradoresRecentesUnicos.size / novosUltimos30Dias) * 100 : 0,
    depositosCount: depositsForConversao.length,
    valorTotalGerado: depositosCarteira + comprasBrutas,
    ticketMedio: buyerIdsUnicos.size ? (depositosCarteira + comprasBrutas) / buyerIdsUnicos.size : 0,
  };

  const stats = {
    total: unifiedCustomers.length,
    leads: unifiedCustomers.filter(c => c.status === 'lead').length,
    clientes: unifiedCustomers.filter(c => c.status === 'cliente').length,
    // super_admin vê a receita REAL da empresa (mesma fonte do módulo
    // Financeiro — comissão de venda + taxa, nunca o valor cheio da venda);
    // visão de rede continua em volume transacionado (a rede não tem como
    // saber quanto da comissão é dela sem esse rateio existir ainda).
    totalSpent: isSuperAdmin
      ? financialIncome.reduce((sum, i) => sum + (i.amount || 0), 0)
      : unifiedCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0),
    semCompra: unifiedCustomers.filter(c => (c.purchase_status || 'sem_compra') === 'sem_compra').length,
    em_negociacao: unifiedCustomers.filter(c => c.purchase_status === 'em_negociacao').length,
    aguardando_pagamento: unifiedCustomers.filter(c => c.purchase_status === 'aguardando_pagamento').length,
    pago: unifiedCustomers.filter(c => c.purchase_status === 'pago').length,
    enviado: unifiedCustomers.filter(c => c.purchase_status === 'enviado').length,
    entregue: unifiedCustomers.filter(c => c.purchase_status === 'entregue').length,
    cancelado: unifiedCustomers.filter(c => c.purchase_status === 'cancelado').length,
    volumeNegociacao: negotiations.filter(n => n.status === 'em_andamento').reduce((sum, n) => sum + (n.total_value || 0), 0),
    leiloesArrematados: unifiedCustomers.reduce((sum, c) => sum + (c.auctions_won || 0), 0),
    vendedores: unifiedCustomers.filter(c => c.role_type === 'vendedor').length,
    licenciados: unifiedCustomers.filter(c => c.role_type === 'licenciado').length,
    influencers: unifiedCustomers.filter(c => c.role_type === 'influencer').length,
    investidores: unifiedCustomers.filter(c => c.role_type === 'investidor').length,
    leiloeiros: unifiedCustomers.filter(c => c.role_type === 'leiloeiro').length,
    arrematantes: unifiedCustomers.filter(c => c.role_type === 'arrematante').length,
    produtosDisponiveis: availableProducts.length,
    // 🔴 DIR-10 — usava preço de VENDA ao consumidor (selling_price_retail), que
    // embute a margem de lucro inteira e nunca bate com o que a empresa realmente
    // tem investido em estoque. cost_price é o valor real pago pelo produto — é
    // isso que representa dinheiro parado em estoque, não o quanto renderia se
    // vendesse tudo pelo preço de tabela.
    valorEstoque: availableProducts.reduce((sum, p) => sum + ((p.cost_price || 0) * (p.quantity || 0)), 0),
    depositosCarteira,
    volumeVendasBruto,
    // "tudo, tudo, tudo": depósito + venda bruta de Loja/PDV + venda bruta
    // de leilão, somados num só número — volume, não receita.
    volumeFinanceiroTotal: depositosCarteira + volumeVendasBruto,
    espelhoPainelAlavancagem,
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-16 bg-white border border-nz-borda rounded-2xl">
        <ShieldAlert className="w-12 h-12 mx-auto text-nz-tinta-fraca/50 mb-3" />
        <p className="text-nz-tinta-fraca">Acesso restrito a administradores.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-nz-tinta-fraca">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 bg-white border border-nz-borda rounded-2xl">
      <div className="max-w-[1800px] mx-auto">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-bold text-nz-tinta">CRM - Gestão de Clientes</h1>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              onClick={() => setShowSellerModal(true)}
              className="bg-nz-marrom hover:bg-nz-marrom-claro text-white flex-1 sm:flex-none text-xs sm:text-sm"
            >
              <UserPlus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Novo Vendedor</span>
              <span className="sm:hidden">Vendedor</span>
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
                  last_contact: new Date().toISOString().split('T')[0],
                  interested_products: []
                });
                setShowProductSearch(false);
                setProductSearchTerm('');
                setShowAddForm(true);
              }}
              className="bg-nz-verde hover:bg-nz-verde-claro text-white flex-1 sm:flex-none text-xs sm:text-sm"
            >
              <UserPlus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Novo Cliente</span>
              <span className="sm:hidden">Cliente</span>
            </Button>
          </div>
        </div>

        <CrmStatsCards
          stats={stats}
          isSuperAdmin={isSuperAdmin}
          purchaseStatusFilter={purchaseStatusFilter}
          onPurchaseStatusClick={setPurchaseStatusFilter}
        />

        {/* TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4 sm:mb-6">
          <TabsList className="bg-white border border-nz-borda w-full sm:w-auto">
            <TabsTrigger value="customers" className="data-[state=active]:bg-nz-verde data-[state=active]:text-white text-nz-tinta-fraca flex-1 sm:flex-none">
              Clientes
            </TabsTrigger>
            <TabsTrigger value="sellers" className="data-[state=active]:bg-nz-marrom data-[state=active]:text-white text-nz-tinta-fraca flex-1 sm:flex-none">
              Vendedores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers">
            {/* FILTROS DE CLIENTES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nz-tinta-fraca" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white text-nz-tinta border-nz-borda"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white text-nz-tinta rounded-md px-4 py-2 border border-nz-borda focus:outline-none focus:ring-2 focus:ring-nz-verde/40"
          >
            <option value="all">Todos os Status</option>
            <option value="lead">Leads</option>
            <option value="cliente">Clientes</option>
            <option value="inativo">Inativos</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-white text-nz-tinta rounded-md px-4 py-2 border border-nz-borda focus:outline-none focus:ring-2 focus:ring-nz-verde/40"
          >
            <option value="all">Todas as Origens</option>
            <option value="cadastro">Cadastro na Plataforma</option>
            <option value="loja_virtual">Loja Virtual</option>
            <option value="leilao">Leilão</option>
            <option value="indicacao">Indicação</option>
            <option value="site">Site</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="redes_sociais">Redes Sociais</option>
            <option value="outro">Outro</option>
          </select>

          <select
            value={roleTypeFilter}
            onChange={(e) => setRoleTypeFilter(e.target.value)}
            className="bg-white text-nz-tinta rounded-md px-4 py-2 border border-nz-borda focus:outline-none focus:ring-2 focus:ring-nz-verde/40"
          >
            <option value="all">Todos os Tipos</option>
            {Object.entries(ROLE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <Button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setSourceFilter('all');
              setPurchaseStatusFilter('all');
              setRoleTypeFilter('all');
            }}
            variant="outline"
            className="bg-white border-nz-borda text-nz-tinta hover:bg-nz-cinza-fundo"
          >
            <Filter className="w-4 h-4 mr-2" />
            Limpar Filtros
          </Button>
          </div>

          <CrmCustomersTable
            customers={filteredCustomers}
            onForward={handleForward}
            onDelete={handleDelete}
            onRowClick={setDetailCustomer}
          />

          {detailCustomer && (
            <CrmCustomerDetailModal customer={detailCustomer} onClose={() => setDetailCustomer(null)} />
          )}
          </TabsContent>

          <TabsContent value="sellers">
            {/* LISTA DE VENDEDORES */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">
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
                        <th className="text-center p-3 font-semibold text-white">Licença</th>
                        <th className="text-center p-3 font-semibold text-white">Status</th>
                        <th className="text-center p-3 font-semibold text-white">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allSellers.map((seller, index) => (
                        <tr
                          key={seller.id}
                          className={`border-b border-gray-700 hover:bg-gray-700/50 transition-colors ${
                            index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50'
                          }`}
                        >
                          <td className="p-3 text-gray-300 font-medium">{seller.name}</td>
                          <td className="p-3 text-gray-400">
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {seller.phone}
                            </div>
                          </td>
                          <td className="p-3 text-gray-400">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {seller.email || '-'}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={
                              seller.license_type === 'loja_distribuidor' ? 'bg-purple-100 text-purple-800' :
                              seller.license_type === 'loja_lider' ? 'bg-orange-100 text-orange-800' :
                              seller.license_type === 'loja_profissional' ? 'bg-blue-100 text-blue-800' :
                              seller.license_type === 'loja_start' ? 'bg-green-100 text-green-800' :
                              seller.license_type === 'loja_inicial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {seller.license_type === 'loja_distribuidor' ? 'Loja Distribuidor' :
                               seller.license_type === 'loja_lider' ? 'Loja Líder' :
                               seller.license_type === 'loja_profissional' ? 'Loja Profissional' :
                               seller.license_type === 'loja_start' ? 'Loja Start' :
                               seller.license_type === 'loja_inicial' ? 'Loja Inicial' :
                               '-'}
                            </Badge>
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
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleSellerStatus(seller)}
                                className={seller.is_active ? 'text-red-400 hover:text-red-300 hover:bg-red-900/30' : 'text-green-400 hover:text-green-300 hover:bg-green-900/30'}
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
                    <span className="inline-flex items-center gap-2">
                      {editingSeller ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {editingSeller ? 'Editar Vendedor' : 'Novo Vendedor'}
                    </span>
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
                        license_type: '',
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

                  <div>
                    <Label className="text-gray-300">Tipo de Licença *</Label>
                    <select
                      value={sellerFormData.license_type}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, license_type: e.target.value })}
                      className="w-full bg-gray-700 text-white rounded-md px-4 py-2 border border-gray-600"
                      required
                    >
                      <option value="">-- Selecione --</option>
                      <option value="loja_inicial">Loja Inicial</option>
                      <option value="loja_start">Loja Start</option>
                      <option value="loja_profissional">Loja Profissional</option>
                      <option value="loja_lider">Loja Líder</option>
                      <option value="loja_distribuidor">Loja Distribuidor</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-300">Comissão do Vendedor (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={sellerFormData.default_commission_percentage}
                        onChange={(e) => setSellerFormData({ ...sellerFormData, default_commission_percentage: parseFloat(e.target.value) || 0 })}
                        className="bg-gray-700 text-white"
                        placeholder="Ex: 10"
                      />
                      <p className="text-xs text-gray-400 mt-1">% aplicada automaticamente no PDV</p>
                    </div>
                    <div>
                      <Label className="text-gray-300">Comissão do Licenciante (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={sellerFormData.default_licenciante_commission_percentage}
                        onChange={(e) => setSellerFormData({ ...sellerFormData, default_licenciante_commission_percentage: parseFloat(e.target.value) || 0 })}
                        className="bg-gray-700 text-white"
                        placeholder="Ex: 5"
                      />
                      <p className="text-xs text-gray-400 mt-1">% do indicador (se houver)</p>
                    </div>
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
                          license_type: '',
                          default_commission_percentage: 0,
                          default_licenciante_commission_percentage: 0,
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
                  <CardTitle className="text-white flex items-center gap-2"><Send className="w-4 h-4" />Encaminhar para Vendedor</CardTitle>
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
            <Card className="bg-gray-800 border-gray-700 max-w-4xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col">
              <CardHeader className="border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-xl font-bold">
                    <span className="inline-flex items-center gap-2">
                      {editingCustomer ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                    </span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingCustomer(null);
                      setShowProductSearch(false);
                      setProductSearchTerm('');
                    }}
                    className="text-gray-400 hover:text-white hover:bg-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto flex-1 p-6">
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

                    {/* PRODUTOS DE INTERESSE */}
                    <div className="col-span-full border-t border-gray-700 pt-4 mt-4">
                      <Label className="text-gray-300 text-base font-semibold mb-3 block">
                        <span className="inline-flex items-center gap-2"><Package className="w-4 h-4" />Produtos de Interesse (opcional)</span>
                      </Label>

                      <div className="space-y-3">
                        {/* Input de Busca - Sempre Visível */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Digite para buscar produtos por nome ou lote..."
                            value={productSearchTerm}
                            onChange={(e) => setProductSearchTerm(e.target.value)}
                            className="pl-10 bg-gray-700 text-white border-gray-600 focus:border-green-500"
                          />
                        </div>

                        {/* Resultados da Busca */}
                        {productSearchTerm && (
                          <div className="max-h-52 overflow-y-auto bg-gray-900 rounded-lg border border-gray-600 shadow-lg">
                            {loadingProducts ? (
                              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-3"></div>
                                <p>Carregando produtos...</p>
                              </div>
                            ) : availableProducts.length === 0 ? (
                              <div className="px-4 py-8 text-center text-yellow-400 text-sm">
                                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p className="font-semibold">Nenhum produto disponível</p>
                                <p className="text-xs mt-1 text-gray-500">Produtos com estoque não carregados</p>
                                <button
                                  type="button"
                                  onClick={loadProducts}
                                  className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors"
                                >
                                  <span className="inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Recarregar Produtos</span>
                                </button>
                              </div>
                            ) : filteredProductsForModal.length > 0 ? (
                              filteredProductsForModal.slice(0, 10).map(product => (
                                <button
                                  key={product.id}
                                  type="button"
                                  onClick={() => addInterestedProduct(product)}
                                  className="w-full text-left px-4 py-3 hover:bg-gray-700 border-b border-gray-700 last:border-b-0 text-white transition-colors group"
                                >
                                  <p className="font-semibold text-sm group-hover:text-green-400 transition-colors">
                                    {product.description}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Lote: {product.lot || 'N/A'} • Estoque: <span className="text-green-400 font-semibold">{product.quantity} un.</span>
                                  </p>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Nenhum produto encontrado com "{productSearchTerm}"</p>
                                <p className="text-xs mt-1">Tente outro termo de busca</p>
                                <p className="text-xs text-green-400 mt-2">
                                  {availableProducts.length} produtos disponíveis no total
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Lista de Produtos Selecionados */}
                        {formData.interested_products.length > 0 && (
                          <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                            <Label className="text-gray-400 text-xs mb-2 block">
                              <span className="inline-flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Produtos Marcados ({formData.interested_products.length}/10)</span>
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              {formData.interested_products.map(p => (
                                <Badge
                                  key={p.product_id}
                                  className="bg-green-600 hover:bg-green-700 text-white pl-3 pr-2 py-1.5 flex items-center gap-2 transition-all"
                                >
                                  <span className="truncate max-w-[200px] text-sm">{p.product_name}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeInterestedProduct(p.product_id)}
                                    className="hover:bg-red-500/20 rounded-full p-0.5 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                            {formData.interested_products.length >= 10 && (
                              <p className="text-xs text-yellow-400 mt-2">
                                <span className="inline-flex items-center gap-1.5"><TriangleAlert className="w-3.5 h-3.5" />Limite máximo atingido (10 produtos)</span>
                              </p>
                            )}
                          </div>
                        )}

                        {/* Mensagem quando nenhum produto está marcado */}
                        {formData.interested_products.length === 0 && !productSearchTerm && (
                          <div className="bg-gray-900/30 p-3 rounded-lg border border-dashed border-gray-700 text-center">
                            <p className="text-xs text-gray-500">
                              Nenhum produto marcado ainda. Use a busca acima para adicionar.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-700 sticky bottom-0 bg-gray-800 -mx-6 px-6 -mb-6 pb-6">
                    <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 py-3">
                      <Save className="w-4 h-4 mr-2" />
                      {editingCustomer ? 'Atualizar Cliente' : 'Salvar Cliente'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingCustomer(null);
                        setShowProductSearch(false);
                        setProductSearchTerm('');
                      }}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 px-6"
                    >
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