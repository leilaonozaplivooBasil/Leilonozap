import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Package, DollarSign, TrendingUp, Search, Filter,
  Download, Save, X, PackagePlus, Calculator, ShoppingCart, BookOpen
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

      const allProducts = await base44.entities.Product.list('-created_date', 1000);
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

    setFilteredProducts(filtered);
  }, [searchTerm, products, classFilter]);

  // Reset page only when filters change (not when products reload)
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, classFilter]);

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
        cost_price: parseFloat(formData.cost_price),
        selling_price_retail: parseFloat(formData.selling_price_retail),
        selling_price_wholesale: parseFloat(formData.selling_price_wholesale),
        sold_amount: parseFloat(formData.sold_amount || 0),
        quantity: parseInt(formData.quantity) || 1,
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
      alert("❌ Erro ao salvar produto");
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Posição de estoque</h1>
          <div className="flex gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-white border-gray-300 text-gray-900 hover:bg-gray-100">
                  <Filter className="w-4 h-4 mr-2" />
                  Mais Ações
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border-gray-200">
                <DropdownMenuItem 
                  onClick={() => navigate(createPageUrl("RegisterBatches"))}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <PackagePlus className="w-4 h-4 mr-2" />
                  Registrar Lotes
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => navigate(createPageUrl("PDV"))}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  PDV
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    if (products.length === 0) {
                      alert('Nenhum produto para exportar');
                      return;
                    }

                    const headers = ['SKU', 'Produto', 'Depósito Empresa', 'Nome Depósito', 'Perfeito', 'Bom', 'Oficina', 'Custo Unit.', 'Preço Venda', 'Estoque Atual', 'Qtd Vendidos', 'Lucro'];
                    const rows = filteredProducts.map(p => [
                      p.lot || 'N/A',
                      p.description || '',
                      p.purchase_order || 'Empresa 3',
                      p.deposit_name || 'Bangu',
                      (p.qty_perfeito || 0).toString(),
                      (p.qty_bom || 0).toString(),
                      ((p.qty_oficina || 0) + (p.qty_ruim || 0)).toString(),
                      (p.cost_price || 0).toFixed(2),
                      (p.selling_price_retail || 0).toFixed(2),
                      (p.quantity || 0).toString(),
                      (p.quantity_sold || 0).toString(),
                      (p.profit || 0).toFixed(2)
                    ]);

                    const csvContent = [
                      headers.join(';'),
                      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
                    ].join('\n');

                    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    const timestamp = new Date().toISOString().split('T')[0];

                    link.setAttribute('href', url);
                    link.setAttribute('download', `posicao_estoque_${timestamp}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    alert(`✅ ${filteredProducts.length} produtos exportados!`);
                  }}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Dados
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => navigate(createPageUrl("CreateCatalogProduct"))}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Novo Produto Catálogo
            </Button>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              Clique aqui para usar seus próprios dados
            </Button>
          </div>
        </div>

        {/* FILTROS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <select
            value={depositNameFilter}
            onChange={(e) => setDepositNameFilter(e.target.value)}
            className="bg-white text-gray-900 rounded-md px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Nome do depósito</option>
            <option value="Bangu">Bangu</option>
            <option value="Oficina">Oficina</option>
            <option value="Recreio">Recreio</option>
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-white text-gray-900 rounded-md px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Total</option>
            <option value="perfeito">
              Perfeito ({products.reduce((sum, p) => sum + (p.qty_perfeito || 0), 0)})
            </option>
            <option value="bom">
              Bom ({products.reduce((sum, p) => sum + (p.qty_bom || 0), 0)})
            </option>
            <option value="oficina">
              Oficina ({products.reduce((sum, p) => sum + (p.qty_oficina || 0) + (p.qty_ruim || 0), 0)})
            </option>
          </select>

          <div className="flex items-center gap-2">
            <Input
              placeholder="SKU"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white text-gray-900 border-gray-300"
            />
            <Button onClick={() => setSearchTerm('')} className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap">
              Apagar
            </Button>
          </div>
        </div>

        {/* CARDS PEQUENOS DE ESTATÍSTICAS */}
        <TooltipProvider>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-gray-800 border-gray-700 cursor-help">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-400 text-xs">Total de produtos</p>
                      <Package className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {filteredProducts.reduce((sum, p) => sum + (p.quantity || 0) + (p.quantity_sold || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">Unidades totais</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-gray-900 border-blue-500/50">
                <p className="font-semibold text-blue-400 mb-2">📦 Total de Produtos</p>
                <p className="text-sm text-gray-300">Soma de todas as unidades (em estoque + já vendidas).</p>
                <p className="text-xs text-gray-400 mt-2">Mostra o volume total de produtos que passaram pelo sistema.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-gray-800 border-gray-700 cursor-help">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-400 text-xs">Testados e aprovados</p>
                      <DollarSign className="w-5 h-5 text-orange-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {filteredProducts.reduce((sum, p) => sum + (p.qty_perfeito || 0) + (p.qty_bom || 0), 0).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-gray-900 border-orange-500/50">
                <p className="font-semibold text-orange-400 mb-2">✅ Testados e Aprovados</p>
                <p className="text-sm text-gray-300">Produtos classificados como "Perfeito" ou "Bom".</p>
                <p className="text-xs text-gray-400 mt-2">Prontos para venda sem necessidade de reparos.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-gray-800 border-gray-700 cursor-help">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-400 text-xs">Vendidos</p>
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.totalSold.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-gray-900 border-green-500/50">
                <p className="font-semibold text-green-400 mb-2">📈 Vendidos</p>
                <p className="text-sm text-gray-300">Total de unidades vendidas.</p>
                <p className="text-xs text-gray-400 mt-2">Representa o volume de produtos que já saíram do estoque via vendas.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-gray-800 border-gray-700 cursor-help">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-400 text-xs">Produtos em Estoque</p>
                      <Package className="w-5 h-5 text-purple-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {stats.inStock.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-gray-900 border-purple-500/50">
                <p className="font-semibold text-purple-400 mb-2">📦 Produtos em Estoque</p>
                <p className="text-sm text-gray-300">Unidades disponíveis no estoque atual.</p>
                <p className="text-xs text-gray-400 mt-2">Quantidade de produtos prontos para venda no momento.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* CARDS GRANDES DE ESTATÍSTICAS */}
        <TooltipProvider>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-white border-gray-200 cursor-help">
                  <CardContent className="p-6">
                    <p className="text-gray-600 text-sm mb-1">Ticket Médio (Funcionais)</p>
                    <p className="text-2xl font-bold text-orange-600">
                      R$ {stats.averageTicketFunctional.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-gray-900 border-orange-500/50">
                <p className="font-semibold text-orange-400 mb-2">🏷️ Ticket Médio (Produtos Funcionando)</p>
                <p className="text-sm text-gray-300">Valor médio de venda dos produtos em estado "Perfeito" ou "Bom".</p>
                <p className="text-xs text-gray-400 mt-2">Ajuda a entender o preço de mercado por unidade dos itens que podem ser vendidos imediatamente.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-white border-gray-200 cursor-help">
                  <CardContent className="p-6">
                    <p className="text-gray-600 text-sm mb-1">Valor de mercadoria em estoque</p>
                    <p className="text-2xl font-bold text-gray-900">
                      R$ {stats.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-gray-900 border-gray-500/50">
                <p className="font-semibold text-gray-300 mb-2">💰 Valor de Mercadoria em Estoque</p>
                <p className="text-sm text-gray-300">Soma do custo de todos os produtos em estoque.</p>
                <p className="text-xs text-gray-400 mt-2">Capital investido em mercadoria atualmente disponível.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-white border-gray-200 cursor-help">
                  <CardContent className="p-6">
                    <p className="text-gray-600 text-sm mb-1">Receita potencial em estoque</p>
                    <p className="text-2xl font-bold text-gray-900">
                      R$ {stats.potentialRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-gray-900 border-gray-500/50">
                <p className="font-semibold text-gray-300 mb-2">💵 Receita Potencial em Estoque</p>
                <p className="text-sm text-gray-300">Valor total se vender todos produtos "Perfeito" e "Bom" pelo preço de varejo.</p>
                <p className="text-xs text-gray-400 mt-2">Receita máxima esperada do estoque aprovado.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-white border-gray-200 cursor-help">
                  <CardContent className="p-6">
                    <p className="text-gray-600 text-sm mb-1">Faturado</p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-gray-900 border-green-500/50">
                <p className="font-semibold text-green-400 mb-2">💸 Faturado</p>
                <p className="text-sm text-gray-300">Total arrecadado com vendas realizadas.</p>
                <p className="text-xs text-gray-400 mt-2">Soma de todos os valores de venda concretizados.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-white border-gray-200 cursor-help">
                  <CardContent className="p-6">
                    <p className="text-gray-600 text-sm mb-1">Lucro</p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {stats.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-gray-900 border-green-500/50">
                <p className="font-semibold text-green-400 mb-2">💎 Lucro</p>
                <p className="text-sm text-gray-300">Diferença entre valor faturado e custo dos produtos vendidos.</p>
                <p className="text-xs text-gray-400 mt-2">Lucro líquido obtido com as vendas (Faturado - Custos).</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* TABELA SIMPLIFICADA */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-900">Posição de estoque</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar valor"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white text-gray-900 border-gray-300 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-800">
                    <th className="text-left p-3 font-semibold text-white">Código</th>
                    <th className="text-left p-3 font-semibold text-white">SKU</th>
                    <th className="text-left p-3 font-semibold text-white">Produto</th>
                    <th className="text-left p-3 font-semibold text-white">Nome Depósito</th>
                    <th className="text-center p-3 font-semibold text-white">Perfeito</th>
                    <th className="text-center p-3 font-semibold text-white">Bom</th>
                    <th className="text-center p-3 font-semibold text-white">Oficina</th>
                    <th className="text-left p-3 font-semibold text-white">Observação</th>
                    <th className="text-right p-3 font-semibold text-white">Custo Total</th>
                    <th className="text-right p-3 font-semibold text-white">Custo Unit.</th>
                    <th className="text-right p-3 font-semibold text-white">Preço Venda</th>
                    <th className="text-right p-3 font-semibold text-white">Estoque Atual</th>
                    <th className="text-right p-3 font-semibold text-white">Qtd Vendidos</th>
                    <th className="text-right p-3 font-semibold text-white">Valor Venda</th>
                    <th className="text-right p-3 font-semibold text-white">Lucro</th>
                    <th className="text-center p-3 font-semibold text-white">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {currentProducts.map((product, index) => (
                    <tr 
                      key={product.id} 
                      className={`border-b border-gray-100 hover:bg-gray-100 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <td className="p-3 text-gray-900 font-medium cursor-pointer" onClick={() => handleEdit(product)}>{product.product_code || product.codigo || product.code || '-'}</td>
                      <td className="p-3 text-gray-900 font-medium cursor-pointer" onClick={() => handleEdit(product)}>{product.lot || 'N/A'}</td>
                      <td className="p-3 text-gray-900 cursor-pointer" onClick={() => handleEdit(product)}>{product.description}</td>
                      <td className="p-3 text-gray-900 cursor-pointer" onClick={() => handleEdit(product)}>{product.deposit_name || 'Bangu'}</td>
                      <td className="p-3 text-center text-gray-900 cursor-pointer" onClick={() => handleEdit(product)}>{product.qty_perfeito || 0}</td>
                      <td className="p-3 text-center text-gray-900 cursor-pointer" onClick={() => handleEdit(product)}>{product.qty_bom || 0}</td>
                      <td className="p-3 text-center text-gray-900 cursor-pointer" onClick={() => handleEdit(product)}>{(product.qty_oficina || 0) + (product.qty_ruim || 0)}</td>
                      <td className="p-3 text-gray-900 text-sm cursor-pointer" onClick={() => handleEdit(product)}>{product.notes || '-'}</td>
                      <td className="p-3 text-right text-gray-900 cursor-pointer" onClick={() => handleEdit(product)}>R$ {(product.cost_price || 0).toFixed(2)}</td>
                      <td className="p-3 text-right text-gray-900 cursor-pointer" onClick={() => handleEdit(product)}>
                        R$ {(() => {
                          const totalQty = (product.quantity || 0) + (product.quantity_sold || 0);
                          const unitCost = totalQty > 0 ? (product.cost_price || 0) / totalQty : (product.cost_price || 0);
                          return unitCost.toFixed(2);
                        })()}
                      </td>
                      <td className="p-3 text-right text-gray-900 cursor-pointer" onClick={() => handleEdit(product)}>R$ {(product.selling_price_retail || 0).toFixed(2)}</td>
                      <td className="p-3 text-right text-gray-900 font-semibold cursor-pointer" onClick={() => handleEdit(product)}>{(product.quantity || 0).toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-900 font-semibold cursor-pointer" onClick={() => handleEdit(product)}>{(product.quantity_sold || 0).toLocaleString()}</td>
                      <td className="p-3 text-right text-blue-600 font-bold cursor-pointer" onClick={() => handleEdit(product)}>R$ {(product.sold_amount || 0).toFixed(2)}</td>
                      <td className="p-3 text-right text-green-600 font-bold cursor-pointer" onClick={() => handleEdit(product)}>R$ {(product.profit || 0).toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduct(product);
                              setShowCalculator(true);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            title="Calculadora de Preço"
                          >
                            <Calculator className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGoogleShoppingProduct(product.description);
                              setShowGoogleShopping(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            title="Pesquisar Google Shopping"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(createPageUrl("EditCatalogProduct") + `?id=${product.id}`);
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            title="Editar no Catálogo"
                          >
                            <BookOpen className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum produto encontrado</p>
                </div>
              )}
            </div>

            {/* PAGINAÇÃO */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-white">
              <span className="text-sm text-gray-600">
                {startIndex + 1} - {Math.min(endIndex, filteredProducts.length)} / {filteredProducts.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 mr-2">
                  Página {currentPage} de {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-gray-600 border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  &lt;
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-gray-600 border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  &gt;
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="bg-gray-700 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Lote</Label>
                      <Input
                        value={formData.lot}
                        onChange={(e) => setFormData({...formData, lot: e.target.value})}
                        className="bg-gray-700 text-white"
                        placeholder="Ex: 15575"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Nota Fiscal</Label>
                      <Input
                        value={formData.purchase_order}
                        onChange={(e) => setFormData({...formData, purchase_order: e.target.value})}
                        className="bg-gray-700 text-white"
                        placeholder="Ex: 0001"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Nome do Depósito</Label>
                      <select
                        value={formData.deposit_name}
                        onChange={(e) => setFormData({...formData, deposit_name: e.target.value})}
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
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
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
                            onChange={(e) => setFormData({...formData, qty_perfeito: e.target.value})}
                            className="bg-gray-700 text-white"
                            min="0"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-400 text-sm">Bom</Label>
                          <Input
                            type="number"
                            value={formData.qty_bom}
                            onChange={(e) => setFormData({...formData, qty_bom: e.target.value})}
                            className="bg-gray-700 text-white"
                            min="0"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-400 text-sm">Oficina</Label>
                          <Input
                            type="number"
                            value={formData.qty_oficina}
                            onChange={(e) => setFormData({...formData, qty_oficina: e.target.value})}
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
                        onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
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
                        onChange={(e) => setFormData({...formData, selling_price_retail: e.target.value})}
                        className="bg-gray-700 text-white"
                      />
                    </div>

                    <div className="col-span-full">
                      <Label className="text-gray-300">Observações</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
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
                            onClick={async () => {
                              if (!confirm('⚠️ Resetar estoque? Isso irá zerar vendas e lucro deste produto.')) return;

                              try {
                                const totalQty = (editingProduct.quantity || 0) + (editingProduct.quantity_sold || 0);

                                await base44.entities.Product.update(editingProduct.id, {
                                  quantity: totalQty,
                                  quantity_sold: 0,
                                  sold_amount: 0,
                                  profit: 0,
                                  status: 'ESTOQUE'
                                });

                                alert('✅ Estoque resetado com sucesso!');
                                sessionStorage.removeItem('products_cache_v3');
                                sessionStorage.removeItem('products_cache_time_v3');
                                setShowAddForm(false);
                                setEditingProduct(null);
                                setTimeout(() => loadData(), 1000);
                              } catch (error) {
                                console.error('Erro ao resetar estoque:', error);
                                alert('❌ Erro ao resetar estoque');
                              }
                            }}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            🔄 Resetar Estoque
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
    </div>
  );
}