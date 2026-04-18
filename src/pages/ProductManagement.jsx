import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Package, DollarSign, TrendingUp, Search, Filter,
  Download, Save, X, PackagePlus, Calculator, ShoppingCart, BookOpen,
  Trash2, RotateCcw
} from 'lucide-react';

import PriceCalculatorModal from '@/components/pricing/PriceCalculatorModal';
import GoogleShoppingModal from '@/components/pricing/GoogleShoppingModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [depositNameFilter, setDepositNameFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [depositCompanyFilter, setDepositCompanyFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [ignoreDepositFilter, setIgnoreDepositFilter] = useState('all');
  const [viewMode, setViewMode] = useState('currentStock');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [importResults, setImportResults] = useState(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [batchConversion, setBatchConversion] = useState(null);
  const [gtinCode, setGtinCode] = useState("");
  const [isSearchingGtin, setIsSearchingGtin] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [currentObservation, setCurrentObservation] = useState({ productId: null, text: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 34;
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showGoogleShopping, setShowGoogleShopping] = useState(false);
  const [googleShoppingProduct, setGoogleShoppingProduct] = useState(null);
  const [showOperationModal, setShowOperationModal] = useState(false);
  const [operationType, setOperationType] = useState(null);
  const [operationData, setOperationData] = useState({ operatorName: '', reason: '' });
  const [expandedNotes, setExpandedNotes] = useState({});
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    lot: '',
    description: '',
    quantity: 1,
    qty_perfeito: 0,
    qty_bom: 0,
    qty_oficina: 0,
    cost_price: 0,
    selling_price_retail: 0,
    selling_price_wholesale: 0,
    status: 'ESTOQUE',
    sold_amount: 0,
    notes: '',
    purchase_order: '',
    deposit_name: 'Bangu'
  });

  const navigate = useNavigate();

  const stats = React.useMemo(() => {
    const inStock = filteredProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalInvested = filteredProducts.reduce((sum, p) => sum + (p.cost_price || 0), 0);
    const potentialRevenue = filteredProducts.reduce((sum, p) => {
      const qtyPerfeitoBom = (p.qty_perfeito || 0) + (p.qty_bom || 0);
      return sum + ((p.selling_price_retail || 0) * qtyPerfeitoBom);
    }, 0);
    const totalSold = filteredProducts.reduce((sum, p) => sum + (p.quantity_sold || 0), 0);
    const totalRevenue = filteredProducts.reduce((sum, p) => sum + (p.sold_amount || 0), 0);
    const totalProfit = filteredProducts.reduce((sum, p) => sum + (p.profit || 0), 0);

    const functionalProducts = filteredProducts.filter(p => (p.qty_perfeito > 0 || p.qty_bom > 0));
    const totalValueFunctional = functionalProducts.reduce((sum, p) => {
      const functionalQty = (p.qty_perfeito || 0) + (p.qty_bom || 0);
      return sum + ((p.selling_price_retail || 0) * functionalQty);
    }, 0);
    const totalFunctionalQty = functionalProducts.reduce((sum, p) => sum + (p.qty_perfeito || 0) + (p.qty_bom || 0), 0);
    const averageTicketFunctional = totalFunctionalQty > 0 ? totalValueFunctional / totalFunctionalQty : 0;

    return { inStock, totalInvested, potentialRevenue, totalSold, totalRevenue, totalProfit, averageTicketFunctional };
  }, [filteredProducts]);

  const loadData = useCallback(async (retryCount = 0) => {
    if (isLoadingData) return;

    setIsLoadingData(true);
    try {
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

      // Cache agressivo de 5 minutos
      const cachedProducts = sessionStorage.getItem('products_cache_v3');
      const cacheTime = sessionStorage.getItem('products_cache_time_v3');

      if (cachedProducts && cacheTime && retryCount === 0) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 300000) { // 5 minutos
          console.log('⚡ Usando cache de produtos');
          const cached = JSON.parse(cachedProducts);
          setProducts(cached);
          setFilteredProducts(cached);
          setIsLoading(false);
          setIsLoadingData(false);
          return;
        }
      }

      const allProducts = await base44.entities.Product.list('-created_date', 5000);
      setProducts(allProducts);
      setFilteredProducts(allProducts);

      // Salva no cache
      sessionStorage.setItem('products_cache_v3', JSON.stringify(allProducts));
      sessionStorage.setItem('products_cache_time_v3', Date.now().toString());

    } catch (error) {
      console.error("Erro ao carregar produtos:", error);

      // Se for rate limit, usa cache antigo
      if (error.message?.includes('Rate limit')) {
        const cachedProducts = sessionStorage.getItem('products_cache_v3');
        if (cachedProducts) {
          console.log('⚡ Usando cache antigo devido a rate limit');
          const cached = JSON.parse(cachedProducts);
          setProducts(cached);
          setFilteredProducts(cached);
        } else {
          alert('⚠️ Muitas requisições. Por favor, aguarde 30 segundos e recarregue a página.');
        }
      }
    } finally {
      setIsLoading(false);
      setIsLoadingData(false);
    }
  }, [navigate, isLoadingData]);

  useEffect(() => {
    loadData();
  }, []);

  const getProductClass = (product) => {
    const perfeito = product.qty_perfeito || 0;
    const bom = product.qty_bom || 0;
    const ruim = product.qty_ruim || 0;
    const oficina = (product.qty_oficina || 0) + ruim; // Ruim agora conta como oficina

    if (perfeito >= bom && perfeito >= oficina) return 'perfeito';
    if (bom >= oficina) return 'bom';
    return 'oficina';
  };

  useEffect(() => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.lot?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (classFilter !== 'all') {
      filtered = filtered.filter(p => getProductClass(p) === classFilter);
    }

    // Filtro por depósito: "all" mostra TODOS (incluindo os sem deposit_name)
    if (depositNameFilter !== 'all') {
      filtered = filtered.filter(p => p.deposit_name === depositNameFilter);
    }

    setFilteredProducts(filtered);
  }, [searchTerm, products, classFilter, depositNameFilter]);

  // Reset page only when filters change (not when products reload)
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, classFilter, depositNameFilter]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      date: product.date,
      lot: product.lot || '',
      description: product.description,
      quantity: product.quantity,
      qty_perfeito: product.qty_perfeito || 0,
      qty_bom: product.qty_bom || 0,
      qty_oficina: (product.qty_oficina || 0) + (product.qty_ruim || 0), // Ruim agora é oficina
      cost_price: product.cost_price,
      selling_price_retail: product.selling_price_retail || 0,
      selling_price_wholesale: product.selling_price_wholesale || 0,
      status: product.status,
      sold_amount: product.sold_amount || 0,
      notes: product.notes || '',
      purchase_order: product.purchase_order || '',
      deposit_name: product.deposit_name || 'Bangu'
    });
    setShowAddForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const totalQuantity = parseInt(formData.quantity) + (editingProduct?.quantity_sold || 0);
      const custoUnitario = totalQuantity > 0 ? parseFloat(formData.cost_price) / totalQuantity : parseFloat(formData.cost_price);
      const quantidadeVendida = editingProduct?.quantity_sold || 0;
      const profit = formData.sold_amount ? (parseFloat(formData.sold_amount) - (custoUnitario * quantidadeVendida)) : 0;

      const dataToSave = {
        ...formData,
        profit,
        cost_price: parseFloat(formData.cost_price) || 0,
        selling_price_retail: parseFloat(formData.selling_price_retail) || 0,
        selling_price_wholesale: parseFloat(formData.selling_price_wholesale) || 0,
        sold_amount: parseFloat(formData.sold_amount || 0),
        status: formData.status || 'ESTOQUE',
        quantity: Math.max(1, parseInt(formData.quantity) || 1),
        qty_perfeito: parseInt(formData.qty_perfeito) || 0,
        qty_bom: parseInt(formData.qty_bom) || 0,
        qty_ruim: 0, // Sempre zero - ruim não existe mais
        qty_oficina: parseInt(formData.qty_oficina) || 0
      };

      if (editingProduct) {
        await base44.entities.Product.update(editingProduct.id, dataToSave);
        alert('✅ Produto atualizado!');
      } else {
        await base44.entities.Product.create(dataToSave);
        alert('✅ Produto cadastrado!');
      }

      setFormData({
        date: new Date().toISOString().split('T')[0],
        lot: '',
        description: '',
        quantity: 1,
        qty_perfeito: 0,
        qty_bom: 0,
        qty_oficina: 0,
        cost_price: 0,
        selling_price_retail: 0,
        selling_price_wholesale: 0,
        status: 'ESTOQUE',
        sold_amount: 0,
        notes: '',
        purchase_order: '',
        deposit_name: 'Bangu'
      });
      setShowAddForm(false);
      setEditingProduct(null);

      // Limpa cache e recarrega com delay
      sessionStorage.removeItem('products_cache_v3');
      sessionStorage.removeItem('products_cache_time_v3');
      setTimeout(() => loadData(), 1000);

    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("❌ Erro ao salvar produto: " + (error?.message || JSON.stringify(error)));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm font-medium">Carregando estoque...</p>
        </div>
      </div>
    );
  }

  const depositBadge = (dep) => {
    const map = { Bangu: 'bg-blue-500/15 text-blue-300 border border-blue-500/30', Oficina: 'bg-orange-500/15 text-orange-300 border border-orange-500/30', Recreio: 'bg-purple-500/15 text-purple-300 border border-purple-500/30' };
    return map[dep] || 'bg-gray-700 text-gray-300';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ═══ HEADER FAIXA ═══ */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 border-b border-gray-800 px-6 py-4 sticky top-16 z-30 backdrop-blur-sm">
        <div className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none">Gestão de Estoque</h1>
              <p className="text-xs text-gray-500 mt-0.5">{filteredProducts.length} produto(s) exibido(s)</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">
                  <Filter className="w-3.5 h-3.5 mr-1.5" />
                  Mais Ações
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-900 border-gray-700 text-white shadow-xl">
                <DropdownMenuItem onClick={() => navigate(createPageUrl("RegisterBatches"))} className="cursor-pointer hover:bg-gray-800 text-gray-300 hover:text-white">
                  <PackagePlus className="w-4 h-4 mr-2 text-blue-400" /> Registrar Lotes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(createPageUrl("PDV"))} className="cursor-pointer hover:bg-gray-800 text-gray-300 hover:text-white">
                  <DollarSign className="w-4 h-4 mr-2 text-green-400" /> PDV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(createPageUrl("ProductOperationHistory"))} className="cursor-pointer hover:bg-gray-800 text-gray-300 hover:text-white">
                  <BookOpen className="w-4 h-4 mr-2 text-purple-400" /> Histórico de Operação
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (products.length === 0) { alert('Nenhum produto para exportar'); return; }
                    const headers = ['SKU', 'Produto', 'Depósito Empresa', 'Nome Depósito', 'Perfeito', 'Bom', 'Oficina', 'Custo Unit.', 'Preço Venda', 'Estoque Atual', 'Qtd Vendidos', 'Lucro'];
                    const rows = filteredProducts.map(p => [p.lot || 'N/A', p.description || '', p.purchase_order || 'Empresa 3', p.deposit_name || 'Bangu', (p.qty_perfeito || 0).toString(), (p.qty_bom || 0).toString(), ((p.qty_oficina || 0) + (p.qty_ruim || 0)).toString(), (p.cost_price || 0).toFixed(2), (p.selling_price_retail || 0).toFixed(2), (p.quantity || 0).toString(), (p.quantity_sold || 0).toString(), (p.profit || 0).toFixed(2)]);
                    const csvContent = [headers.join(';'), ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))].join('\n');
                    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.setAttribute('href', URL.createObjectURL(blob));
                    link.setAttribute('download', `posicao_estoque_${new Date().toISOString().split('T')[0]}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    alert(`✅ ${filteredProducts.length} produtos exportados!`);
                  }}
                  className="cursor-pointer hover:bg-gray-800 text-gray-300 hover:text-white"
                >
                  <Download className="w-4 h-4 mr-2 text-yellow-400" /> Exportar CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" onClick={async () => {
              if (!confirm('Agrupar produtos duplicados?')) return;
              try {
                setIsLoading(true);
                const result = await base44.functions.invoke('groupDuplicateProducts', {});
                alert(`✅ ${result.data.grupos_processados} grupos | ${result.data.produtos_deletados} removidos`);
                sessionStorage.removeItem('products_cache_v3');
                sessionStorage.removeItem('products_cache_time_v3');
                await loadData();
              } catch { alert('❌ Erro ao agrupar'); } finally { setIsLoading(false); }
            }} className="bg-orange-600/90 hover:bg-orange-600 text-white border-0">
              <Package className="w-3.5 h-3.5 mr-1.5" /> Agrupar Duplicados
            </Button>
            <Button size="sm" onClick={() => navigate(createPageUrl("AddCatalogProduct"))} className="bg-violet-600/90 hover:bg-violet-600 text-white border-0">
              <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Catálogo
            </Button>
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-lg shadow-emerald-900/40">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Produto
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-6 space-y-6">

        {/* ═══ FILTROS ═══ */}
        <div className="flex flex-wrap gap-3 items-center bg-gray-900/60 border border-gray-800 rounded-2xl px-4 py-3">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <Input
            placeholder="Buscar por SKU ou nome do produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-0 text-white placeholder:text-gray-600 focus-visible:ring-0 flex-1 min-w-[200px] p-0 h-auto text-sm"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-gray-500 hover:text-gray-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="w-px h-5 bg-gray-700 flex-shrink-0" />
          <select
            value={depositNameFilter}
            onChange={(e) => setDepositNameFilter(e.target.value)}
            className="bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">Todos os depósitos</option>
            <option value="Bangu">🔵 Bangu</option>
            <option value="Oficina">🟠 Oficina</option>
            <option value="Recreio">🟣 Recreio</option>
          </select>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">Todas as classes</option>
            <option value="perfeito">✅ Perfeito ({products.reduce((s, p) => s + (p.qty_perfeito || 0), 0)})</option>
            <option value="bom">🟡 Bom ({products.reduce((s, p) => s + (p.qty_bom || 0), 0)})</option>
            <option value="oficina">🔧 Oficina ({products.reduce((s, p) => s + (p.qty_oficina || 0) + (p.qty_ruim || 0), 0)})</option>
          </select>
        </div>

        {/* ═══ CARDS TOPO — 4 KPIs ═══ */}
        <TooltipProvider>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total de Unidades', value: filteredProducts.reduce((s, p) => s + (p.quantity || 0) + (p.quantity_sold || 0), 0).toLocaleString(), icon: Package, color: 'text-blue-400', bg: 'from-blue-500/10 to-transparent', border: 'border-blue-500/20', tooltip: 'Soma de todas as unidades (em estoque + vendidas).' },
              { label: 'Testados & Aprovados', value: filteredProducts.reduce((s, p) => s + (p.qty_perfeito || 0) + (p.qty_bom || 0), 0).toLocaleString(), icon: TrendingUp, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-transparent', border: 'border-emerald-500/20', tooltip: 'Perfeito + Bom — prontos para venda.' },
              { label: 'Qtd Vendidos', value: stats.totalSold.toLocaleString(), icon: ShoppingCart, color: 'text-violet-400', bg: 'from-violet-500/10 to-transparent', border: 'border-violet-500/20', tooltip: 'Total de unidades que já saíram do estoque via vendas.' },
              { label: 'Saldo em Estoque', value: stats.inStock.toLocaleString(), icon: Package, color: 'text-amber-400', bg: 'from-amber-500/10 to-transparent', border: 'border-amber-500/20', tooltip: 'Unidades disponíveis no estoque atual.' },
            ].map(({ label, value, icon: Icon, color, bg, border, tooltip }) => (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <div className={`rounded-2xl border ${border} bg-gradient-to-br ${bg} bg-gray-900 p-4 cursor-help hover:border-opacity-50 transition-all`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 border-gray-700 text-gray-300 text-xs max-w-[200px]">{tooltip}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        {/* ═══ CARDS FINANCEIROS — 5 KPIs ═══ */}
        <TooltipProvider>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Ticket Médio', value: `R$ ${stats.averageTicketFunctional.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-orange-300', border: 'border-orange-500/25', accent: 'bg-orange-500', tooltip: 'Valor médio por unidade dos produtos Perfeito ou Bom.' },
              { label: 'Capital em Estoque', value: `R$ ${stats.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-sky-300', border: 'border-sky-500/25', accent: 'bg-sky-500', tooltip: 'Soma do custo de todos os produtos em estoque.' },
              { label: 'Receita Potencial', value: `R$ ${stats.potentialRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-indigo-300', border: 'border-indigo-500/25', accent: 'bg-indigo-500', tooltip: 'Receita máxima vendendo todos os Perfeito + Bom.' },
              { label: 'Faturado', value: `R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-emerald-300', border: 'border-emerald-500/25', accent: 'bg-emerald-500', tooltip: 'Total arrecadado com vendas realizadas.' },
              { label: 'Lucro Líquido', value: `R$ ${stats.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-green-300', border: 'border-green-500/25', accent: 'bg-green-500', tooltip: 'Diferença entre valor faturado e custo dos produtos.' },
            ].map(({ label, value, color, border, accent, tooltip }) => (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <div className={`rounded-2xl border ${border} bg-gray-900 p-4 cursor-help hover:bg-gray-800/60 transition-all group relative overflow-hidden`}>
                    <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent} opacity-60`} />
                    <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wider">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 border-gray-700 text-gray-300 text-xs max-w-[200px]">{tooltip}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        {/* ═══ TABELA ═══ */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
          {/* Table Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">Posição de Estoque</h2>
            <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded-full">{filteredProducts.length} produto(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800/70 border-b border-gray-700/60">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Produto</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Depósito</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-emerald-600 uppercase tracking-wider">Perfeito</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-yellow-600 uppercase tracking-wider">Bom</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-orange-600 uppercase tracking-wider">Oficina</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Obs.</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">C. Total</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">C. Unit.</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Preço Venda</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estoque</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendidos</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor Venda</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lucro</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {currentProducts.map((product, index) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-gray-800/50 transition-colors cursor-pointer group ${index % 2 === 0 ? 'bg-transparent' : 'bg-gray-900/40'}`}
                  >
                    <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap" onClick={() => handleEdit(product)}>{product.date || '—'}</td>
                    <td className="px-3 py-2.5" onClick={() => handleEdit(product)}>
                      <span className="font-mono text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">{product.lot || 'N/A'}</span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-200 font-medium max-w-[200px] truncate" onClick={() => handleEdit(product)} title={product.description}>{product.description}</td>
                    <td className="px-3 py-2.5" onClick={() => handleEdit(product)}>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${depositBadge(product.deposit_name || 'Bangu')}`}>{product.deposit_name || 'Bangu'}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center" onClick={() => handleEdit(product)}>
                      {(product.qty_perfeito || 0) > 0
                        ? <span className="text-emerald-400 font-bold text-sm">{product.qty_perfeito}</span>
                        : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center" onClick={() => handleEdit(product)}>
                      {(product.qty_bom || 0) > 0
                        ? <span className="text-yellow-400 font-bold text-sm">{product.qty_bom}</span>
                        : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center" onClick={() => handleEdit(product)}>
                      {((product.qty_oficina || 0) + (product.qty_ruim || 0)) > 0
                        ? <span className="text-orange-400 font-bold text-sm">{(product.qty_oficina || 0) + (product.qty_ruim || 0)}</span>
                        : <span className="text-gray-700">—</span>}
                    </td>
                    <td
                      className="px-3 py-2.5 text-gray-500 text-xs max-w-[120px] cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setExpandedNotes(prev => ({ ...prev, [product.id]: !prev[product.id] })); }}
                    >
                      <div className={expandedNotes[product.id] ? '' : 'truncate'}>{product.notes || '—'}</div>
                      {product.notes && product.notes.length > 40 && (
                        <span className="text-blue-500 text-xs">{expandedNotes[product.id] ? '▲' : '▼'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-400 text-xs whitespace-nowrap" onClick={() => handleEdit(product)}>R$ {(product.cost_price || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-400 text-xs whitespace-nowrap" onClick={() => handleEdit(product)}>
                      R$ {(() => { const tq = (product.quantity || 0) + (product.quantity_sold || 0); return tq > 0 ? ((product.cost_price || 0) / tq).toFixed(2) : (product.cost_price || 0).toFixed(2); })()}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs whitespace-nowrap" onClick={() => handleEdit(product)}>
                      {(product.selling_price_retail || 0) > 0
                        ? <span className="text-gray-300">R$ {product.selling_price_retail.toFixed(2)}</span>
                        : <span className="text-yellow-500 text-xs">⚠ S/ preço</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap" onClick={() => handleEdit(product)}>
                      <span className="font-bold text-white">{(product.quantity || 0).toLocaleString()}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-400 text-xs whitespace-nowrap" onClick={() => handleEdit(product)}>{(product.quantity_sold || 0).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right text-sky-400 font-semibold text-xs whitespace-nowrap" onClick={() => handleEdit(product)}>R$ {(product.sold_amount || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-xs whitespace-nowrap" onClick={() => handleEdit(product)}>
                      <span className={(product.profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        R$ {(product.profit || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); setShowCalculator(true); }}
                          className="w-7 h-7 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white flex items-center justify-center transition-all"
                          title="Calculadora"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setGoogleShoppingProduct(product.description); setShowGoogleShopping(true); }}
                          className="w-7 h-7 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white flex items-center justify-center transition-all"
                          title="Google Shopping"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(createPageUrl("AddCatalogProduct"), { state: { sourceProduct: product } }); }}
                          className="w-7 h-7 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-400 hover:text-white flex items-center justify-center transition-all"
                          title="Catálogo"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredProducts.length === 0 && (
              <div className="text-center py-16 text-gray-600">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum produto encontrado</p>
              </div>
            )}
          </div>

          {/* PAGINAÇÃO */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-900/60">
            <span className="text-xs text-gray-600">
              {startIndex + 1}–{Math.min(endIndex, filteredProducts.length)} de {filteredProducts.length}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-600 mr-2">Pág. {currentPage}/{totalPages}</span>
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="w-7 h-7 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-xs font-bold"
              >‹</button>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="w-7 h-7 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-xs font-bold"
              >›</button>
            </div>
          </div>
        </div>

        {/* MODAL DE EDIÇÃO/CRIAÇÃO */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <Card className="bg-gray-800 border-gray-700 max-w-4xl w-full my-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">
                    {editingProduct ? '✏️ Editar Produto' : '➕ Novo Produto'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingProduct(null);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-gray-300">Data</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="bg-gray-700 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Lote</Label>
                      <Input
                        value={formData.lot}
                        onChange={(e) => setFormData({ ...formData, lot: e.target.value })}
                        className="bg-gray-700 text-white"
                        placeholder="Ex: 15575"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Nota Fiscal</Label>
                      <Input
                        value={formData.purchase_order}
                        onChange={(e) => setFormData({ ...formData, purchase_order: e.target.value })}
                        className="bg-gray-700 text-white"
                        placeholder="Ex: 0001"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Nome do Depósito</Label>
                      <select
                        value={formData.deposit_name}
                        onChange={(e) => setFormData({ ...formData, deposit_name: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded-md px-3 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Bangu">Bangu</option>
                        <option value="Oficina">Oficina</option>
                        <option value="Recreio">Recreio</option>
                      </select>
                    </div>

                    <div className="col-span-full">
                      <Label className="text-gray-300">Descrição *</Label>
                      <Input
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="bg-gray-700 text-white"
                        placeholder="Ex: Fritadeira Air Fryer 8L"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Quantidade Total</Label>
                      <Input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        className="bg-gray-700 text-white"
                        min="1"
                      />
                    </div>

                    <div className="col-span-full">
                      <Label className="text-gray-300 mb-3 block">Classificação do Estoque</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-gray-400 text-sm">Perfeito</Label>
                          <Input
                            type="number"
                            value={formData.qty_perfeito}
                            onChange={(e) => setFormData({ ...formData, qty_perfeito: e.target.value })}
                            className="bg-gray-700 text-white"
                            min="0"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-400 text-sm">Bom</Label>
                          <Input
                            type="number"
                            value={formData.qty_bom}
                            onChange={(e) => setFormData({ ...formData, qty_bom: e.target.value })}
                            className="bg-gray-700 text-white"
                            min="0"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-400 text-sm">Oficina</Label>
                          <Input
                            type="number"
                            value={formData.qty_oficina}
                            onChange={(e) => setFormData({ ...formData, qty_oficina: e.target.value })}
                            className="bg-gray-700 text-white"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-300">Custo Total *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.cost_price}
                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                        className="bg-gray-700 text-white"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Custo Unitário (calculado)</Label>
                      <Input
                        type="text"
                        value={(() => {
                          const totalQty = (parseInt(formData.quantity) || 0) + (editingProduct?.quantity_sold || 0);
                          const unitCost = totalQty > 0 ? (parseFloat(formData.cost_price) || 0) / totalQty : (parseFloat(formData.cost_price) || 0);
                          return `R$ ${unitCost.toFixed(2)}`;
                        })()}
                        className="bg-gray-600 text-white"
                        disabled
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Preço Varejo</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.selling_price_retail}
                        onChange={(e) => setFormData({ ...formData, selling_price_retail: e.target.value })}
                        className="bg-gray-700 text-white"
                      />
                    </div>

                    <div className="col-span-full">
                      <Label className="text-gray-300">Observações</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="bg-gray-700 text-white"
                        placeholder="Adicione observações sobre o produto..."
                        rows={3}
                      />
                    </div>

                    <div className="col-span-full flex gap-2">
                      <Button type="submit" className="bg-green-600 hover:bg-green-700">
                        <Save className="w-4 h-4 mr-2" />
                        {editingProduct ? 'Atualizar' : 'Salvar'}
                      </Button>
                      {editingProduct && (
                        <>
                          <Button
                            type="button"
                            onClick={() => {
                              navigate(createPageUrl("CreateAuction") + `?product_id=${editingProduct.id}`);
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Colocar em Leilão
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setOperationType('zerar_estoque');
                              setShowOperationModal(true);
                            }}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Zerar Estoque
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setOperationType('excluir_produto');
                              setShowOperationModal(true);
                            }}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir Produto
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingProduct(null);
                        }}
                        className="border-gray-600 text-gray-300"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      <PriceCalculatorModal
        isOpen={showCalculator}
        onClose={() => {
          setShowCalculator(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSave={() => {
          sessionStorage.removeItem('products_cache_v3');
          sessionStorage.removeItem('products_cache_time_v3');
          loadData();
        }}
      />

      <GoogleShoppingModal
        isOpen={showGoogleShopping}
        onClose={() => {
          setShowGoogleShopping(false);
          setGoogleShoppingProduct(null);
        }}
        productName={googleShoppingProduct}
      />

      {/* MODAL DE CONFIRMAÇÃO DE OPERAÇÃO */}
      {showOperationModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="bg-gray-800 border-gray-700 max-w-md w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">
                  {operationType === 'zerar_estoque' ? '🔄 Zerar Estoque' : '🗑️ Excluir Produto'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowOperationModal(false);
                    setOperationData({ operatorName: '', reason: '' });
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Nome do Operador *</Label>
                  <Input
                    value={operationData.operatorName}
                    onChange={(e) => setOperationData({ ...operationData, operatorName: e.target.value })}
                    className="bg-gray-700 text-white"
                    placeholder="Digite seu nome"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Motivo da {operationType === 'zerar_estoque' ? 'zeração de estoque' : 'exclusão'} *</Label>
                  <Textarea
                    value={operationData.reason}
                    onChange={(e) => setOperationData({ ...operationData, reason: e.target.value })}
                    className="bg-gray-700 text-white"
                    placeholder="Descreva o motivo..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      if (!operationData.operatorName || !operationData.reason) {
                        alert('⚠️ Preencha todos os campos');
                        return;
                      }

                      try {
                        // Registra a operação
                        await base44.entities.ProductOperation.create({
                          product_id: editingProduct.id,
                          product_description: editingProduct.description,
                          operation_type: operationType,
                          operator_name: operationData.operatorName,
                          reason: operationData.reason,
                          operation_date: new Date().toISOString()
                        });

                        if (operationType === 'zerar_estoque') {
                          // Zera APENAS a quantidade total (quantity = 0)
                          await base44.entities.Product.update(editingProduct.id, {
                            quantity: 0,
                            qty_perfeito: 0,
                            qty_bom: 0,
                            qty_oficina: 0
                          });
                          alert('✅ Estoque zerado com sucesso!');
                        } else {
                          // Exclui o produto
                          await base44.entities.Product.delete(editingProduct.id);
                          alert('✅ Produto excluído com sucesso!');
                        }

                        sessionStorage.removeItem('products_cache_v3');
                        sessionStorage.removeItem('products_cache_time_v3');
                        setShowAddForm(false);
                        setEditingProduct(null);
                        setShowOperationModal(false);
                        setOperationData({ operatorName: '', reason: '' });
                        setTimeout(() => loadData(), 1000);
                      } catch (error) {
                        console.error('Erro:', error);
                        alert('❌ Erro ao realizar operação');
                      }
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Confirmar Operação
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowOperationModal(false);
                      setOperationData({ operatorName: '', reason: '' });
                    }}
                    className="flex-1 border-gray-600 text-gray-300"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}