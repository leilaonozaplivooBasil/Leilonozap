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
  Trash2, RotateCcw, RefreshCw, ArrowLeft
} from 'lucide-react';

import PriceCalculatorModal from '@/components/pricing/PriceCalculatorModal';
import GoogleShoppingModal from '@/components/pricing/GoogleShoppingModal';
import PricingPreviewModal from '@/components/pricing/PricingPreviewModal';
import { calculateProductPricing } from '@/functions/calculateProductPricing';
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
  const [alertFilter, setAlertFilter] = useState('all');
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
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const saved = sessionStorage.getItem('productMgmt_currentPage');
      return saved ? parseInt(saved) || 1 : 1;
    } catch { return 1; }
  });
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    try {
      const saved = localStorage.getItem('productMgmt_itemsPerPage');
      const parsed = saved ? parseInt(saved) : 50;
      return [20, 50, 100, 200].includes(parsed) ? parsed : 50;
    } catch { return 50; }
  });
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [goToPageInput, setGoToPageInput] = useState('');
  const tableRef = React.useRef(null);

  // 📌 Ao trocar de página, rola suave pro topo da tabela (não pula pro topo da página)
  const changePage = (newPage) => {
    setCurrentPage(newPage);
    setTimeout(() => {
      if (tableRef.current) {
        const headerOffset = 140; // header sticky + margem
        const elementTop = tableRef.current.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: elementTop, behavior: 'smooth' });
      }
    }, 50);
  };
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showGoogleShopping, setShowGoogleShopping] = useState(false);
  const [googleShoppingProduct, setGoogleShoppingProduct] = useState(null);
  const [showOperationModal, setShowOperationModal] = useState(false);
  const [operationType, setOperationType] = useState(null);
  const [operationData, setOperationData] = useState({ operatorName: '', reason: '' });
  const [expandedNotes, setExpandedNotes] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showPricingPreview, setShowPricingPreview] = useState(false);
  const [pricingPreviewData, setPricingPreviewData] = useState(null);
  const [isPricingLoading, setIsPricingLoading] = useState(false);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === currentProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentProducts.map(p => p.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Precificar em lote — divide em lotes de 5 para evitar timeout 504
  const handleBatchPrice = async (idsOverride) => {
    const ids = idsOverride || Array.from(selectedIds);
    if (ids.length === 0) {
      alert('Selecione produtos para precificar');
      return;
    }
    if (!confirm(`Buscar preço de mercado para ${ids.length} produto(s)?\n\nSerão processados em lotes de 5.`)) return;
    
    setIsPricingLoading(true);
    try {
      const BATCH_SIZE = 5;
      const allResults = [];

      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const response = await calculateProductPricing({ product_ids: batch, searchapi: false, zoom: false });
        const batchProducts = response?.products || response?.data?.products || [];
        allResults.push(...batchProducts);
      }

      setPricingPreviewData(allResults);
      setShowPricingPreview(true);
    } catch (error) {
      alert('❌ Erro ao buscar preços: ' + error.message);
    } finally {
      setIsPricingLoading(false);
    }
  };

  // 🆕 Precificar por item — mostra ANTES/DEPOIS e pede confirmação
  const handleSinglePrice = async (product) => {
    setIsPricingLoading(true);
    try {
      const response = await calculateProductPricing({
        product_ids: [product.id]
      });
      const data = response?.products || response?.data?.products || [];
      const item = data[0];

      if (!item) {
        alert('⚠️ Nenhum resultado encontrado');
        return;
      }

      if (item.status !== 'success') {
        alert('⚠️ Preço de mercado não encontrado para este produto');
        return;
      }

      // ✅ Popup de confirmação ANTES/DEPOIS
      const prevMarket = item.previous_market || 0;
      const prevPrice = item.previous_price || 0;
      const newMarket = item.market_price;
      const newPrice = item.selling_price_retail;

      const msg =
        `📊 Confirmar Precificação?\n\n` +
        `Produto: ${item.description}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `P. MERCADO:\n` +
        `  Antes:  ${prevMarket > 0 ? 'R$ ' + prevMarket.toFixed(2) : '—'}\n` +
        `  Depois: R$ ${newMarket.toFixed(2)}\n\n` +
        `P. VENDA (-20%):\n` +
        `  Antes:  ${prevPrice > 0 ? 'R$ ' + prevPrice.toFixed(2) : '—'}\n` +
        `  Depois: R$ ${newPrice.toFixed(2)}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Aplicar nova precificação?`;

      if (!confirm(msg)) {
        return;
      }

      const updateData = { selling_price_retail: newPrice, price_catalog: newPrice, market_value: newMarket };
      if (item.source_url) updateData.source_url = item.source_url;
      const _save = await base44.functions.invoke('saveProductPricing', { items: [{ id: item.id, selling_price_retail: newPrice, market_price: newMarket, source_url: item.source_url }] });
      if (!_save?.success) { alert('❌ Não salvou o preço: ' + (_save?.error || 'falha')); return; }

      // ✅ Atualiza estado local IMEDIATAMENTE
      const updater = (list) => list.map(p => p.id === item.id ? { ...p, ...updateData } : p);
      setProducts(prev => updater(prev));
      setFilteredProducts(prev => updater(prev));

      sessionStorage.removeItem('products_cache_v3');
      sessionStorage.removeItem('products_cache_time_v3');

      alert('✅ Precificação aplicada!');
    } catch (error) {
      alert('❌ Erro: ' + error.message);
    } finally {
      setIsPricingLoading(false);
    }
  };

  // 🆕 Confirmar precificação e salvar (via service_role — anon não persiste)
  const handleConfirmPricing = async (toUpdate) => {
    setIsPricingLoading(true);
    try {
      const items = toUpdate.map((item) => ({
        id: item.id,
        selling_price_retail: item.selling_price_retail,
        market_price: item.market_price,
        source_url: item.source_url,
      }));
      const r = await base44.functions.invoke('saveProductPricing', { items });
      if (!r?.success) { alert('❌ Erro ao salvar preços: ' + (r?.error || 'falha')); return; }
      alert(`✅ ${r.saved} produto(s) precificado(s)!`);
      setShowPricingPreview(false);
      setPricingPreviewData(null);
      clearSelection();
      sessionStorage.removeItem('products_cache_v3');
      sessionStorage.removeItem('products_cache_time_v3');
      setTimeout(() => loadData(), 500);
    } catch (error) {
      alert('❌ Erro ao salvar: ' + error.message);
    } finally {
      setIsPricingLoading(false);
    }
  };
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

        // Pode gerir produtos: admin OU cargos com estoque próprio (Distribuidor, Loja Física, Ponto de Retirada)
        const STOCK_CARGOS = ['distribuidor', 'loja_fisica', 'ponto_retirada'];
        const podeProduto = user.role === 'admin' || user.role === 'super_admin' ||
          (Array.isArray(user.career_levels) && user.career_levels.some((c) => STOCK_CARGOS.includes(c)));
        if (!podeProduto) {
          alert("❌ Acesso negado! Apenas Distribuidor, Loja Física, Ponto de Retirada ou administradores.");
          navigate(createPageUrl('Home'));
          return;
        }
      }

      // Cache agressivo de 1 minuto (reduzido de 5 para capturar mudanças rápido)
      const cachedProducts = sessionStorage.getItem('products_cache_v3');
      const cacheTime = sessionStorage.getItem('products_cache_time_v3');

      if (cachedProducts && cacheTime && retryCount === 0) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 60000) { // 1 minuto
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
    const oficina = (product.qty_oficina || 0) + ruim;

    if (perfeito >= bom && perfeito >= oficina) return 'perfeito';
    if (bom >= oficina) return 'bom';
    return 'oficina';
  };

  const getProductAlerts = (product) => {
    const alerts = [];
    if (!product.selling_price_retail || product.selling_price_retail === 0) {
      alerts.push({ label: '🔴 Sem Preço', cls: 'bg-red-900/40 text-red-400 border border-red-700/40' });
    }
    if ((product.quantity || 0) < 0) {
      alerts.push({ label: '💥 ERRO', cls: 'bg-red-900/60 text-red-300 border border-red-500/60' });
    }
    if (product.created_date) {
      const daysSince = Math.floor((Date.now() - new Date(product.created_date)) / 86400000);
      if (daysSince > 60 && (!product.quantity_sold || product.quantity_sold === 0)) {
        alerts.push({ label: '🐌 Parado', cls: 'bg-orange-900/40 text-orange-400 border border-orange-700/40' });
      }
    }
    return alerts;
  };

  // 🔎 Debounce da busca (300ms) — evita filtrar a cada tecla em tabelas grandes
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 💾 Persiste itens por página no localStorage
  useEffect(() => {
    try { localStorage.setItem('productMgmt_itemsPerPage', String(itemsPerPage)); } catch { /* ignora */ }
  }, [itemsPerPage]);

  // 💾 Persiste página atual no sessionStorage (volta pra mesma página após editar)
  useEffect(() => {
    try { sessionStorage.setItem('productMgmt_currentPage', String(currentPage)); } catch { /* ignora */ }
  }, [currentPage]);

  useEffect(() => {
    let filtered = products;

    if (debouncedSearchTerm) {
      filtered = filtered.filter(p =>
        p.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        p.lot?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    if (classFilter !== 'all') {
      filtered = filtered.filter(p => getProductClass(p) === classFilter);
    }

    if (depositNameFilter !== 'all') {
      filtered = filtered.filter(p => p.deposit_name === depositNameFilter);
    }

    if (alertFilter === 'no_price') {
      filtered = filtered.filter(p => !p.selling_price_retail || p.selling_price_retail === 0);
    } else if (alertFilter === 'stopped') {
      filtered = filtered.filter(p => {
        const days = p.created_date ? Math.floor((Date.now() - new Date(p.created_date)) / 86400000) : 0;
        return days > 60 && (!p.quantity_sold || p.quantity_sold === 0);
      });
    } else if (alertFilter === 'error') {
      filtered = filtered.filter(p => (p.quantity || 0) < 0);
    }

    setFilteredProducts(filtered);
  }, [debouncedSearchTerm, products, classFilter, depositNameFilter, alertFilter]);

  // Reset page only when filters change (not when products reload)
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, classFilter, depositNameFilter, alertFilter, itemsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      changePage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      changePage(currentPage + 1);
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
        const _r = await base44.functions.invoke('productAdminAction', { action: 'update', actorId: currentUser?.id, productId: editingProduct.id, fields: dataToSave });
        if (!_r?.success) { alert('❌ Não atualizou: ' + (_r?.error || 'falha')); return; }
        alert('✅ Produto atualizado!');
      } else {
        const _c = await base44.functions.invoke('bulkImportProducts', { actorId: currentUser?.id, publish: false, items: [{ name: dataToSave.description, price: dataToSave.selling_price_retail, cost: dataToSave.cost_price, quantity: dataToSave.quantity, sku: dataToSave.lot }] });
        if (!_c?.success) { alert('❌ Não cadastrou: ' + (_c?.error || 'falha')); return; }
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
    const map = { Bangu: 'bg-blue-500/15 text-blue-300 border border-blue-500/30', Oficina: 'bg-orange-500/15 text-orange-300 border border-orange-500/30', Recreio: 'bg-purple-500/15 text-purple-300 border border-purple-500/30', Shopmix: 'bg-pink-500/15 text-pink-300 border border-pink-500/30' };
    return map[dep] || 'bg-gray-700 text-gray-300';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ═══ HEADER FAIXA ═══ */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 border-b border-gray-800 px-6 py-4 sticky top-16 z-30 backdrop-blur-sm">
        <div className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/painel')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-700 transition-colors flex-shrink-0"
              title="Voltar ao painel"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
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
              <DropdownMenuContent className="bg-gray-900 border-gray-700 text-white shadow-xl min-w-[200px]">
                <DropdownMenuItem onClick={() => setShowAddForm(!showAddForm)} className="cursor-pointer hover:bg-gray-800 text-gray-300 hover:text-white">
                  <Plus className="w-4 h-4 mr-2 text-emerald-400" /> Novo Produto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(createPageUrl("AddCatalogProduct"))} className="cursor-pointer hover:bg-gray-800 text-gray-300 hover:text-white">
                  <BookOpen className="w-4 h-4 mr-2 text-violet-400" /> Loja Virtual
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(createPageUrl("CreateAuction"))} className="cursor-pointer hover:bg-gray-800 text-gray-300 hover:text-white">
                  <TrendingUp className="w-4 h-4 mr-2 text-blue-400" /> Criar Leilão
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(createPageUrl("RegisterBatches"))} className="cursor-pointer hover:bg-gray-800 text-gray-300 hover:text-white">
                  <PackagePlus className="w-4 h-4 mr-2 text-blue-400" /> Registrar Lotes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(createPageUrl("PDV"))} className="cursor-pointer hover:bg-gray-800 text-gray-300 hover:text-white">
                  <DollarSign className="w-4 h-4 mr-2 text-green-400" /> PDV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(createPageUrl("CatalogOrdersAdmin"))} className="cursor-pointer hover:bg-gray-800 text-gray-300 hover:text-white">
                  <ShoppingCart className="w-4 h-4 mr-2 text-green-400" /> Pedidos do Catálogo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(createPageUrl("ProductOperationHistory"))} className="cursor-pointer hover:bg-gray-800 text-gray-300 hover:text-white">
                  <BookOpen className="w-4 h-4 mr-2 text-purple-400" /> Histórico de Operação
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    if (!confirm('Agrupar produtos duplicados?')) return;
                    try {
                      setIsLoading(true);
                      const result = await base44.functions.invoke('groupDuplicateProducts', {});
                      alert(`✅ ${result.data.grupos_processados} grupos | ${result.data.produtos_deletados} removidos`);
                      sessionStorage.removeItem('products_cache_v3');
                      sessionStorage.removeItem('products_cache_time_v3');
                      await loadData();
                    } catch { alert('❌ Erro ao agrupar'); } finally { setIsLoading(false); }
                  }}
                  className="cursor-pointer hover:bg-gray-800 text-gray-300 hover:text-white"
                >
                  <Package className="w-4 h-4 mr-2 text-orange-400" /> Agrupar Duplicados
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
                <DropdownMenuItem
                  onClick={() => {
                    sessionStorage.removeItem('products_cache_v3');
                    sessionStorage.removeItem('products_cache_time_v3');
                    loadData();
                  }}
                  disabled={isLoadingData}
                  className="cursor-pointer hover:bg-gray-800 text-gray-300 hover:text-white"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 text-cyan-400 ${isLoadingData ? 'animate-spin' : ''}`} /> Recarregar Dados
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            className="bg-gray-900 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 border border-gray-700/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer hover:border-gray-600 transition-colors appearance-none pr-7"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            <option value="all">Depósito</option>
            <option value="Bangu">Bangu</option>
          </select>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-gray-900 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 border border-gray-700/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer hover:border-gray-600 transition-colors appearance-none pr-7"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            <option value="all">Classe</option>
            <option value="perfeito">Perfeito ({products.reduce((s, p) => s + (p.qty_perfeito || 0), 0)})</option>
            <option value="bom">Bom ({products.reduce((s, p) => s + (p.qty_bom || 0), 0)})</option>
            <option value="oficina">Oficina ({products.reduce((s, p) => s + (p.qty_oficina || 0) + (p.qty_ruim || 0), 0)})</option>
          </select>
          <select
            value={alertFilter}
            onChange={(e) => setAlertFilter(e.target.value)}
            className="bg-gray-900 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 border border-gray-700/60 focus:outline-none focus:ring-1 focus:ring-red-500/50 cursor-pointer hover:border-gray-600 transition-colors appearance-none pr-7"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            <option value="all">Alertas</option>
            <option value="no_price">Sem Preço ({products.filter(p => !p.selling_price_retail || p.selling_price_retail === 0).length})</option>
            <option value="stopped">Parados 60d+ ({products.filter(p => { const d = p.created_date ? Math.floor((Date.now() - new Date(p.created_date)) / 86400000) : 0; return d > 60 && (!p.quantity_sold || p.quantity_sold === 0); }).length})</option>
            <option value="error">Erro Estoque ({products.filter(p => (p.quantity || 0) < 0).length})</option>
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
        <div ref={tableRef} className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
          {/* Table Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">Posição de Estoque</h2>
            <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded-full">{filteredProducts.length} produto(s)</span>
          </div>

          {/* BARRA DE AÇÕES EM LOTE */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-950/60 border-b border-blue-800/50 flex-wrap">
              <span className="text-sm font-semibold text-blue-300">{selectedIds.size} selecionado(s)</span>
              <Button
                size="sm"
                onClick={() => {
                  const ids = Array.from(selectedIds);
                  if (ids.length === 1) {
                    const prod = products.find(p => p.id === ids[0]);
                    const sourceUrl = prod?.source_url || '';
                    const mlParam = sourceUrl ? `&ml_url=${encodeURIComponent(sourceUrl)}` : '';
                    navigate(createPageUrl("CreateAuction") + `?product_id=${ids[0]}${mlParam}`);
                  } else {
                    navigate(createPageUrl("CreateAuction") + `?product_ids=${ids.join(',')}`);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white border-0 h-7 text-xs px-3"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Colocar em Leilão
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  const ids = Array.from(selectedIds);
                  if (ids.length === 1) {
                    navigate(createPageUrl("AddCatalogProduct"), { state: { sourceProduct: products.find(p => p.id === ids[0]) } });
                  } else {
                    alert('⚠️ Selecione apenas 1 produto para colocar no Catálogo');
                  }
                }}
                className="bg-violet-600 hover:bg-violet-500 text-white border-0 h-7 text-xs px-3"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                Loja Virtual
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    disabled={isPricingLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 h-7 text-xs px-3"
                  >
                    {isPricingLoading ? (
                      <><span className="w-3.5 h-3.5 mr-1.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />Buscando...</>
                    ) : (
                      <>⚡ Precificar Auto ▾</>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-900 border-gray-700 text-white shadow-xl">
                  <DropdownMenuItem
                    onClick={() => handleBatchPrice(Array.from(selectedIds).slice(0, 1))}
                    className="cursor-pointer hover:bg-gray-800 text-gray-300 hover:text-white text-xs"
                  >
                    ⚡ Precificar 1 produto
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBatchPrice(Array.from(selectedIds).slice(0, 10))}
                    className="cursor-pointer hover:bg-gray-800 text-gray-300 hover:text-white text-xs"
                  >
                    ⚡ Precificar 10 produtos
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBatchPrice(Array.from(selectedIds))}
                    className="cursor-pointer hover:bg-gray-800 text-emerald-400 hover:text-emerald-300 text-xs font-semibold"
                  >
                    ⚡ Precificar todos ({selectedIds.size})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button onClick={clearSelection} className="text-xs text-gray-500 hover:text-gray-300 ml-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="text-sm" style={{minWidth: '1200px', width: '100%'}}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-800 border-b border-gray-700 shadow-sm">
                  <th className="px-3 py-2.5 text-center" style={{width:'36px'}}>
                    <input
                      type="checkbox"
                      checked={currentProducts.length > 0 && selectedIds.size === currentProducts.length}
                      onChange={toggleSelectAll}
                      className="accent-blue-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap" style={{width:'90px'}}>Data</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap" style={{width:'110px'}}>SKU</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{width:'220px'}}>Produto</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap" style={{width:'100px'}}>Publicado</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap" style={{width:'90px'}}>Depósito</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-emerald-500 uppercase tracking-wider whitespace-nowrap" style={{width:'72px'}}>✅ Perf.</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-yellow-500 uppercase tracking-wider whitespace-nowrap" style={{width:'60px'}}>🟡 Bom</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-orange-500 uppercase tracking-wider whitespace-nowrap" style={{width:'70px'}}>🔧 Ofic.</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{width:'130px'}}>Obs.</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap" style={{width:'90px'}}>C. Total</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap" style={{width:'80px'}}>C. Unit.</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-purple-500 uppercase tracking-wider whitespace-nowrap" style={{width:'90px'}}>P. Mercado</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-sky-500 uppercase tracking-wider whitespace-nowrap" style={{width:'90px'}}>P. Venda</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap" style={{width:'72px'}}>Estoque</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap" style={{width:'72px'}}>Vendidos</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-blue-500 uppercase tracking-wider whitespace-nowrap" style={{width:'90px'}}>Vl. Venda</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-emerald-500 uppercase tracking-wider whitespace-nowrap" style={{width:'80px'}}>Lucro</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap" style={{width:'90px'}}>Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {currentProducts.map((product, index) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-gray-800/50 transition-colors cursor-pointer group ${selectedIds.has(product.id) ? 'bg-blue-950/30' : index % 2 === 0 ? 'bg-transparent' : 'bg-gray-900/40'}`}
                  >
                    <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="accent-blue-500 w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap" onClick={() => handleEdit(product)}>{product.date || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap" onClick={() => handleEdit(product)}>
                      <span className="font-mono text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded whitespace-nowrap">{product.lot || 'N/A'}</span>
                    </td>
                    <td className="px-3 py-2.5 overflow-hidden" style={{maxWidth: '220px'}} onClick={() => handleEdit(product)} title={product.description}>
                      <div className="truncate text-gray-200 font-medium text-sm">{product.description}</div>
                      {(() => {
                        const alerts = getProductAlerts(product);
                        if (alerts.length === 0) return null;
                        return (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {alerts.map((a, i) => (
                              <span key={i} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${a.cls}`}>{a.label}</span>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-0.5">
                        {product.catalog_active && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 whitespace-nowrap">🛒 Loja</span>
                        )}
                        {(product.linked_auctions?.length > 0) && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-nowrap">🔨 Leilão ({product.linked_auctions.length})</span>
                        )}
                        {!product.catalog_active && !(product.linked_auctions?.length > 0) && (
                          <span className="text-[10px] text-gray-700">—</span>
                        )}
                      </div>
                    </td>
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
                      className="px-3 py-2.5 text-gray-500 text-xs cursor-pointer"
                      style={{maxWidth: '140px'}}
                      onClick={(e) => { e.stopPropagation(); setExpandedNotes(prev => ({ ...prev, [product.id]: !prev[product.id] })); }}
                    >
                      {product.notes ? (
                        <div className={expandedNotes[product.id] ? 'text-gray-400' : 'truncate text-gray-600'}>{product.notes}</div>
                      ) : <span className="text-gray-800">—</span>}
                      {product.notes && product.notes.length > 30 && (
                        <span className="text-blue-600 text-xs ml-1">{expandedNotes[product.id] ? '▲' : '▼'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-400 text-xs whitespace-nowrap" onClick={() => handleEdit(product)}>R$ {(product.cost_price || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-400 text-xs whitespace-nowrap" onClick={() => handleEdit(product)}>
                      R$ {(() => { const tq = (product.quantity || 0) + (product.quantity_sold || 0); return tq > 0 ? ((product.cost_price || 0) / tq).toFixed(2) : (product.cost_price || 0).toFixed(2); })()}
                    </td>
                    <td className="px-3 py-2.5 text-right text-purple-400 font-semibold text-xs whitespace-nowrap" onClick={() => handleEdit(product)}>
                      {(product.market_value || 0) > 0
                        ? <span>R$ {product.market_value.toFixed(2)}</span>
                        : <span className="text-gray-600">—</span>}
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
                          onClick={(e) => { e.stopPropagation(); handleSinglePrice(product); }}
                          disabled={isPricingLoading}
                          className="w-7 h-7 rounded-lg bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white flex items-center justify-center transition-all disabled:opacity-50"
                          title="Precificar automaticamente (Google Shopping)"
                        >
                          ⚡
                        </button>
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
                          title="Loja Virtual"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const sourceUrl = product?.source_url || '';
                            const mlParam = sourceUrl ? `&ml_url=${encodeURIComponent(sourceUrl)}` : '';
                            navigate(createPageUrl("CreateAuction") + `?product_id=${product.id}${mlParam}`);
                          }}
                          className="w-7 h-7 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white flex items-center justify-center transition-all"
                          title="Criar Leilão"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
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

          {/* PAGINAÇÃO PADRÃO GRANDES PLAYERS */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-800 bg-gray-900/60">
            {/* Esquerda: contador + itens por página */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-500 whitespace-nowrap">
                <span className="text-gray-300 font-semibold">{startIndex + 1}–{Math.min(endIndex, filteredProducts.length)}</span>
                <span className="text-gray-600"> de </span>
                <span className="text-gray-300 font-semibold">{filteredProducts.length.toLocaleString()}</span>
              </span>
              <div className="w-px h-4 bg-gray-700" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-600">Mostrar</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                  className="bg-gray-800 text-gray-200 text-xs rounded-md px-2 py-1 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer hover:border-gray-600 transition-colors"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>

            {/* Direita: paginação inteligente + ir para */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Campo "Ir para" — oculto em mobile muito pequeno */}
              {totalPages > 5 && (
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="text-xs text-gray-600">Ir para</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={goToPageInput}
                    onChange={(e) => setGoToPageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const num = parseInt(goToPageInput);
                        if (num >= 1 && num <= totalPages) {
                          changePage(num);
                          setGoToPageInput('');
                        }
                      }
                    }}
                    placeholder={String(currentPage)}
                    className="w-14 bg-gray-800 text-gray-200 text-xs text-center rounded-md px-2 py-1 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 hover:border-gray-600 transition-colors"
                  />
                </div>
              )}

              {/* Indicador Pág X/Y */}
              <span className="text-xs text-gray-500 whitespace-nowrap">
                Pág. <span className="text-gray-300 font-semibold">{currentPage}</span>/<span className="text-gray-400">{totalPages || 1}</span>
              </span>

              {/* Botões de navegação */}
              <div className="flex items-center gap-1">
                {/* First */}
                <button
                  onClick={() => changePage(1)}
                  disabled={currentPage === 1}
                  title="Primeira página"
                  className="w-8 h-8 rounded-md bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-xs font-bold"
                >«</button>
                {/* Prev */}
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  title="Página anterior"
                  className="w-8 h-8 rounded-md bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-xs font-bold"
                >‹</button>

                {/* Números com reticências inteligentes */}
                {(() => {
                  if (totalPages <= 1) return null;
                  const pages = [];
                  const push = (p) => pages.push(p);
                  const siblings = 1; // vizinhos
                  const boundaries = 1; // primeiro/último

                  const leftBoundary = 1 + boundaries;
                  const rightBoundary = totalPages - boundaries;
                  const leftSibling = Math.max(currentPage - siblings, leftBoundary + 1);
                  const rightSibling = Math.min(currentPage + siblings, rightBoundary - 1);

                  // Início
                  for (let i = 1; i <= Math.min(boundaries, totalPages); i++) push(i);
                  if (leftSibling > leftBoundary + 1) push('left-dots');
                  // Middle
                  for (let i = leftSibling; i <= rightSibling; i++) {
                    if (i > boundaries && i <= totalPages - boundaries) push(i);
                  }
                  if (rightSibling < rightBoundary - 1) push('right-dots');
                  // Fim
                  for (let i = Math.max(totalPages - boundaries + 1, boundaries + 1); i <= totalPages; i++) push(i);

                  return pages.map((p, idx) => {
                    if (p === 'left-dots' || p === 'right-dots') {
                      return <span key={`${p}-${idx}`} className="px-1 text-gray-600 text-xs">…</span>;
                    }
                    const isActive = p === currentPage;
                    return (
                      <button
                        key={p}
                        onClick={() => changePage(p)}
                        className={`min-w-[32px] h-8 rounded-md border transition-all text-xs font-semibold px-2 ${isActive
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                      >{p}</button>
                    );
                  });
                })()}

                {/* Next */}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || totalPages === 0}
                  title="Próxima página"
                  className="w-8 h-8 rounded-md bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-xs font-bold"
                >›</button>
                {/* Last */}
                <button
                  onClick={() => changePage(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  title="Última página"
                  className="w-8 h-8 rounded-md bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-xs font-bold"
                >»</button>
              </div>
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
                        <option value="Shopmix">Shopmix (Catálogo)</option>
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

                    <div className="col-span-full flex flex-wrap gap-2">
                      <Button type="submit" className="bg-green-600 hover:bg-green-700">
                        <Save className="w-4 h-4 mr-2" />
                        {editingProduct ? 'Atualizar' : 'Salvar'}
                      </Button>
                      {editingProduct && (
                        <>
                          <Button
                            type="button"
                            onClick={() => {
                              const sourceUrl = editingProduct?.source_url || '';
                              const mlParam = sourceUrl ? `&ml_url=${encodeURIComponent(sourceUrl)}` : '';
                              navigate(createPageUrl("CreateAuction") + `?product_id=${editingProduct.id}${mlParam}`);
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Colocar em Leilão
                          </Button>
                          {/* RETIRAR DA LOJA VIRTUAL */}
                          {editingProduct?.catalog_active && (
                            <Button
                              type="button"
                              onClick={async () => {
                                if (!confirm('Retirar este produto da Loja Virtual?')) return;
                                { const _r = await base44.functions.invoke('productAdminAction', { action: 'setField', actorId: currentUser?.id, productId: editingProduct.id, fields: { catalog_active: false } }); if (!_r?.success) { alert('❌ Falha: ' + (_r?.error || '')); return; } }
                                alert('✅ Produto retirado da Loja Virtual!');
                                sessionStorage.removeItem('products_cache_v3');
                                sessionStorage.removeItem('products_cache_time_v3');
                                setShowAddForm(false);
                                setEditingProduct(null);
                                setTimeout(() => loadData(), 500);
                              }}
                              className="bg-violet-700 hover:bg-violet-800"
                            >
                              🛒 Retirar da Loja
                            </Button>
                          )}

                          {/* RETIRAR DO LEILÃO */}
                          {(editingProduct?.linked_auctions?.length > 0) && (
                            <Button
                              type="button"
                              onClick={async () => {
                                if (!confirm('Limpar os leilões vinculados a este produto?')) return;
                                { const _r = await base44.functions.invoke('productAdminAction', { action: 'setField', actorId: currentUser?.id, productId: editingProduct.id, fields: { linked_auctions: [] } }); if (!_r?.success) { alert('❌ Falha: ' + (_r?.error || '')); return; } }
                                alert('✅ Produto desvinculado dos leilões!');
                                sessionStorage.removeItem('products_cache_v3');
                                sessionStorage.removeItem('products_cache_time_v3');
                                setShowAddForm(false);
                                setEditingProduct(null);
                                setTimeout(() => loadData(), 500);
                              }}
                              className="bg-blue-700 hover:bg-blue-800"
                            >
                              🔨 Retirar do Leilão
                            </Button>
                          )}

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

      <PricingPreviewModal
        isOpen={showPricingPreview}
        onClose={() => {
          setShowPricingPreview(false);
          setPricingPreviewData(null);
        }}
        products={pricingPreviewData}
        onConfirm={handleConfirmPricing}
        isLoading={isPricingLoading}
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
                        if (operationType === 'zerar_estoque') {
                          const _z = await base44.functions.invoke('productAdminAction', { action: 'zerarEstoque', actorId: currentUser?.id, productId: editingProduct.id, operator_name: operationData.operatorName, reason: operationData.reason });
                          if (!_z?.success) { alert('❌ Não zerou: ' + (_z?.error || 'falha')); return; }
                          alert('✅ Estoque zerado com sucesso!');
                        } else {
                          const _d = await base44.functions.invoke('productAdminAction', { action: 'delete', actorId: currentUser?.id, productId: editingProduct.id });
                          if (!_d?.success) { alert('❌ Não excluiu: ' + (_d?.error || 'falha')); return; }
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