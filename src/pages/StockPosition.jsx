import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Package, Search, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PriceCalculatorModal from '@/components/pricing/PriceCalculatorModal';

export default function StockPosition() {
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
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);

        if (user.role !== 'admin' && user.role !== 'super_admin') {
          alert("❌ Acesso negado! Apenas administradores.");
          navigate(createPageUrl('Home'));
          return;
        }
      }

      const allProducts = await base44.entities.Product.list('-created_date', 1000);
      setProducts(allProducts);
      setFilteredProducts(allProducts);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.lot?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const stats = React.useMemo(() => {
    const inStock = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalInvested = products.reduce((sum, p) => sum + (p.cost_price || 0), 0);
    const potentialRevenue = products.reduce((sum, p) => sum + ((p.selling_price_retail || 0) * (p.quantity || 0)), 0);
    
    return { inStock, totalInvested, potentialRevenue };
  }, [products]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-[1800px] mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Posição de estoque</h1>
          <Button
            onClick={() => navigate(createPageUrl("ProductManagement"))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Clique aqui para usar seus próprios dados
          </Button>
        </div>

        {/* FILTROS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <select
            value={depositNameFilter}
            onChange={(e) => setDepositNameFilter(e.target.value)}
            className="bg-gray-800 text-white rounded-md px-4 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Nome do depósito</option>
            <option value="Principal">Principal</option>
            <option value="Secundario">Secundário</option>
            <option value="Recreio">Recreio</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-gray-800 text-white rounded-md px-4 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Categoria</option>
            <option value="eletronicos">Eletrônicos</option>
            <option value="eletrodomesticos">Eletrodomésticos</option>
            <option value="moveis_decoracao">Móveis & Decoração</option>
          </select>

          <select
            value={depositCompanyFilter}
            onChange={(e) => setDepositCompanyFilter(e.target.value)}
            className="bg-gray-800 text-white rounded-md px-4 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Depósito Empresa</option>
            <option value="Empresa 1">Empresa 1</option>
            <option value="Empresa 2">Empresa 2</option>
            <option value="Empresa 3">Empresa 3</option>
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-gray-800 text-white rounded-md px-4 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Classe</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>

          <select
            value={ignoreDepositFilter}
            onChange={(e) => setIgnoreDepositFilter(e.target.value)}
            className="bg-gray-800 text-white rounded-md px-4 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Dep. Desconsiderar</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>

          <div className="flex items-center gap-2">
            <Input
              placeholder="SKU"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-800 text-white border-gray-700"
            />
            <Button 
              onClick={() => setSearchTerm('')} 
              className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap"
            >
              Apagar
            </Button>
          </div>

          <div className="lg:col-span-2 flex items-center justify-end gap-4">
            <span className="text-white text-sm whitespace-nowrap">Selecione a Visualização:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-gray-400 text-sm whitespace-nowrap">Previsão de estoque</span>
              <input
                type="checkbox"
                checked={viewMode === 'currentStock'}
                onChange={() => setViewMode(viewMode === 'currentStock' ? 'stockForecast' : 'currentStock')}
                className="w-11 h-6 bg-gray-200 rounded-full peer appearance-none cursor-pointer checked:bg-blue-600 relative
                after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                checked:after:translate-x-full"
              />
              <span className="text-gray-400 text-sm whitespace-nowrap">Posição de estoque</span>
            </label>
          </div>
        </div>

        {/* CARDS DE ESTATÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <p className="text-gray-400 text-sm mb-1">Produtos em Estoque</p>
              <p className="text-4xl font-bold text-white">
                {stats.inStock.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <p className="text-gray-400 text-sm mb-1">Valor de mercadoria em estoque</p>
              <p className="text-2xl font-bold text-white">
                R$ {stats.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <p className="text-gray-400 text-sm mb-1">Receita potencial em estoque</p>
              <p className="text-2xl font-bold text-white">
                R$ {stats.potentialRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* TABELA SIMPLIFICADA */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Posição de estoque</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar valor"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-900 text-white border-gray-700 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-blue-600">
                    <th className="text-left p-3 font-semibold text-white">Código</th>
                    <th className="text-left p-3 font-semibold text-white">SKU</th>
                    <th className="text-left p-3 font-semibold text-white">Produto</th>
                    <th className="text-left p-3 font-semibold text-white">Depósito Empresa</th>
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
                  {filteredProducts.slice(0, 34).map((product, index) => (
                    <tr 
                      key={product.id} 
                      className={`border-b border-gray-700 hover:bg-gray-700/50 transition-colors ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50'}`}
                    >
                      <td className="p-3 text-gray-300 font-medium">{product.product_code || product.codigo || product.code || '-'}</td>
                      <td className="p-3 text-blue-400 font-medium">{product.lot || 'N/A'}</td>
                      <td className="p-3 text-gray-300">{product.description}</td>
                      <td className="p-3 text-gray-300">{product.purchase_order || 'Empresa 3'}</td>
                      <td className="p-3 text-gray-300">{product.deposit_name || 'Bangu'}</td>
                      <td className="p-3 text-center text-gray-300">{product.qty_perfeito || 0}</td>
                      <td className="p-3 text-center text-gray-300">{product.qty_bom || 0}</td>
                      <td className="p-3 text-center text-gray-300">{(product.qty_oficina || 0) + (product.qty_ruim || 0)}</td>
                      <td 
                        className="p-3 text-gray-300 text-sm cursor-pointer hover:bg-gray-700 transition-colors max-w-xs"
                        onClick={() => setExpandedNotes(prev => ({...prev, [product.id]: !prev[product.id]}))}
                      >
                        <div className={expandedNotes[product.id] ? '' : 'truncate'}>
                          {product.notes || '-'}
                        </div>
                        {product.notes && product.notes.length > 50 && (
                          <span className="text-blue-400 text-xs">
                            {expandedNotes[product.id] ? '▲ minimizar' : '▼ ver mais'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right text-gray-300">R$ {(product.cost_price || 0).toFixed(2)}</td>
                      <td className="p-3 text-right text-gray-300">
                        R$ {(() => {
                          const totalQty = (product.quantity || 0) + (product.quantity_sold || 0);
                          const unitCost = totalQty > 0 ? (product.cost_price || 0) / totalQty : (product.cost_price || 0);
                          return unitCost.toFixed(2);
                        })()}
                      </td>
                      <td className="p-3 text-right text-gray-300">R$ {(product.selling_price_retail || 0).toFixed(2)}</td>
                      <td className="p-3 text-right text-white font-semibold">{(product.quantity || 0).toLocaleString()}</td>
                      <td className="p-3 text-right text-white font-semibold">{(product.quantity_sold || 0).toLocaleString()}</td>
                      <td className="p-3 text-right text-blue-400 font-bold">R$ {(product.sold_amount || 0).toFixed(2)}</td>
                      <td className="p-3 text-right text-green-400 font-bold">R$ {(product.profit || 0).toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(product);
                            setShowCalculator(true);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Calculator className="w-4 h-4 mr-1" />
                          Calcular Preço
                        </Button>
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
            <div className="flex items-center justify-between p-4 border-t border-gray-700 bg-gray-800">
              <span className="text-sm text-gray-400">
                1 - {Math.min(34, filteredProducts.length)} / {filteredProducts.length}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-gray-400 border-gray-600 hover:bg-gray-700">
                  &lt;
                </Button>
                <Button variant="outline" size="sm" className="text-gray-400 border-gray-600 hover:bg-gray-700">
                  &gt;
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      <PriceCalculatorModal
        isOpen={showCalculator}
        onClose={() => {
          setShowCalculator(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSave={loadData}
      />
    </div>
  );
}