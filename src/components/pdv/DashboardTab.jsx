import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DollarSign, Search, ShoppingCart, Package, TrendingUp, BarChart3, ChevronDown, Building2, CalendarDays, Clock
} from 'lucide-react';
import { Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const fmtBRL = (v) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DashboardTab({
  allSales,
  products,
  dashBankFilter,
  setDashBankFilter,
  searchSale,
  setSearchSale,
  isGeneratingCodes,
  generateCodesForOldSales,
  handleEditSale,
  cancelSale
}) {
  const [periodFilter, setPeriodFilter] = React.useState('all');
  const [dateFilter, setDateFilter] = React.useState('');
  const [bankPopoverOpen, setBankPopoverOpen] = React.useState(false);
  const [periodPopoverOpen, setPeriodPopoverOpen] = React.useState(false);

  const periodSales = React.useMemo(() => {
    let filtered = allSales;

    // Filtro por data específica
    if (dateFilter) {
      filtered = filtered.filter(s => {
        const d = s.sale_date || (s.sale_datetime ? s.sale_datetime.substring(0, 10) : '');
        return d === dateFilter;
      });
      return filtered;
    }

    // Filtro por período
    if (periodFilter === 'all') return filtered;
    const days = { '30': 30, '60': 60, '90': 90, '180': 180, '365': 365 }[periodFilter];
    if (!days) return filtered;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return filtered.filter(s => {
      const d = s.sale_date || s.sale_datetime;
      return d && new Date(d) >= cutoff;
    });
  }, [allSales, periodFilter, dateFilter]);

  const dashSales = ['santander', 'itau', 'nubank'].includes(dashBankFilter)
    ? periodSales.filter(s => s.receiving_bank === dashBankFilter)
    : periodSales;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* FILTROS UNIFICADOS */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2">

              {/* BANCO */}
              <Popover open={bankPopoverOpen} onOpenChange={setBankPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" className={`text-xs text-white gap-1.5 ${
                    dashBankFilter !== 'todos' 
                      ? dashBankFilter === 'santander' ? 'bg-red-700 hover:bg-red-600' 
                        : dashBankFilter === 'itau' ? 'bg-orange-700 hover:bg-orange-600' 
                        : 'bg-purple-700 hover:bg-purple-600'
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}>
                    <Building2 className="w-3.5 h-3.5" />
                    {dashBankFilter === 'todos' ? 'Banco' : dashBankFilter === 'santander' ? 'Santander' : dashBankFilter === 'itau' ? 'Itaú' : 'Nubank'}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-2 bg-gray-800 border-gray-700" align="start">
                  <div className="flex flex-col gap-1">
                    {[
                      { value: 'todos', label: 'Todos', color: 'hover:bg-gray-700' },
                      { value: 'santander', label: '🔴 Santander', color: 'hover:bg-red-900/50' },
                      { value: 'itau', label: '🟠 Itaú', color: 'hover:bg-orange-900/50' },
                      { value: 'nubank', label: '🟣 Nubank', color: 'hover:bg-purple-900/50' },
                    ].map(bank => (
                      <button
                        key={bank.value}
                        onClick={() => { setDashBankFilter(bank.value); setBankPopoverOpen(false); }}
                        className={`text-left px-3 py-2 rounded text-sm transition-colors ${bank.color} ${
                          dashBankFilter === bank.value ? 'text-white font-semibold bg-gray-700' : 'text-gray-300'
                        }`}
                      >
                        {bank.label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* PERÍODO */}
              <Popover open={periodPopoverOpen} onOpenChange={setPeriodPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" className={`text-xs text-white gap-1.5 ${
                    periodFilter !== 'all' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-gray-600 hover:bg-gray-500'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    {periodFilter === 'all' ? 'Período' : periodFilter === '365' ? '1 ano' : `${periodFilter} dias`}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-2 bg-gray-800 border-gray-700" align="start">
                  <div className="flex flex-col gap-1">
                    {[
                      { value: 'all', label: 'Tudo' },
                      { value: '30', label: '30 dias' },
                      { value: '60', label: '60 dias' },
                      { value: '90', label: '90 dias' },
                      { value: '180', label: '180 dias' },
                      { value: '365', label: '1 ano' },
                    ].map(p => (
                      <button
                        key={p.value}
                        onClick={() => { setPeriodFilter(p.value); setDateFilter(''); setPeriodPopoverOpen(false); }}
                        className={`text-left px-3 py-2 rounded text-sm transition-colors hover:bg-gray-700 ${
                          periodFilter === p.value && !dateFilter ? 'text-white font-semibold bg-gray-700' : 'text-gray-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* DATA ESPECÍFICA */}
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    if (e.target.value) setPeriodFilter('all');
                  }}
                  className="h-8 px-2 text-xs rounded bg-gray-700 border border-gray-600 text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none [color-scheme:dark]"
                />
                {dateFilter && (
                  <Button size="sm" variant="ghost" onClick={() => setDateFilter('')} className="h-7 px-2 text-xs text-gray-400 hover:text-white">
                    ✕
                  </Button>
                )}
              </div>

              {/* COUNTER */}
              <span className="text-xs text-gray-500 ml-auto">
                {periodSales.length} vendas
                {dateFilter && <span className="text-emerald-400 ml-1">({new Date(dateFilter + 'T12:00:00').toLocaleDateString('pt-BR')})</span>}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* CARDS POR BANCO - mostra só o banco selecionado ou todos */}
        {(() => {
          const bankCards = [
            { value: 'santander', label: '🔴 Santander', sub: 'Produtos Físicos', border: 'border-red-600', text: 'text-red-400' },
            { value: 'itau', label: '🟠 Itaú', sub: 'Licenciados', border: 'border-orange-500', text: 'text-orange-400' },
            { value: 'nubank', label: '🟣 Nubank', sub: 'Parceiros', border: 'border-purple-500', text: 'text-purple-400' },
          ];
          const visibleBanks = dashBankFilter !== 'todos' 
            ? bankCards.filter(b => b.value === dashBankFilter)
            : bankCards;
          return (
            <div className={`grid gap-2 sm:gap-4 ${visibleBanks.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 md:grid-cols-3'}`}>
              {visibleBanks.map(bank => {
                const bankSales = periodSales.filter(s => s.receiving_bank === bank.value);
                return (
                  <Card key={bank.value} className={`bg-gray-800 border-2 ${bank.border}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`${bank.text} text-xs mb-1`}>{bank.label}</p>
                          <p className="text-xs text-gray-400 mb-2">{bank.sub}</p>
                          <p className="text-2xl font-bold text-white">
                            R$ {fmtBRL(bankSales.reduce((sum, s) => sum + (s.total_amount || 0), 0))}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{bankSales.length} vendas</p>
                        </div>
                        <DollarSign className={`w-8 h-8 ${bank.text}`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })()}

        {/* CARDS DE RESUMO GERAL */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 sm:gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Total de Produtos</p>
                  <p className="text-2xl font-bold text-white">
                    {products.reduce((sum, p) => sum + (p.quantity || 0) + (p.quantity_sold || 0), 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Package className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Produtos Vendidos</p>
                  <p className="text-2xl font-bold text-white">
                    {dashSales.reduce((sum, s) => sum + (s.quantity_sold || 0), 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <ShoppingCart className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Faturamento Total</p>
                  <p className="text-2xl font-bold text-green-400">
                    R$ {fmtBRL(dashSales.reduce((sum, s) => sum + (s.total_amount || 0), 0))}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Impostos + Comissões</p>
                  <p className="text-2xl font-bold text-red-400">
                    R$ {fmtBRL(dashSales.reduce((sum, s) => sum + (s.total_taxes || 0) + (s.commission_amount || 0), 0))}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Custo Total</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    R$ {fmtBRL(dashSales.reduce((sum, sale) => {
                      if (sale.product_cost) {
                        return sum + sale.product_cost * (sale.quantity_sold || 1);
                      }
                      return sum;
                    }, 0))}
                  </p>
                </div>
                <Package className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Lucro Líquido</p>
                  <p className="text-2xl font-bold text-purple-400">
                    R$ {fmtBRL(dashSales.reduce((sum, s) => sum + (s.net_amount || 0), 0))}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* TODAS AS VENDAS INDIVIDUAIS */}
      <Card className="bg-gray-800 border-gray-700 mb-6">
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-white flex items-center gap-2 text-sm sm:text-base">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              {['santander', 'itau', 'nubank'].includes(dashBankFilter)
                ? `Vendas - ${dashBankFilter === 'santander' ? '🔴 Santander' : dashBankFilter === 'itau' ? '🟠 Itaú' : '🟣 Nubank'}`
                : `Todas as Vendas`
              } ({(['santander', 'itau', 'nubank'].includes(dashBankFilter) ? periodSales.filter(s => s.receiving_bank === dashBankFilter) : periodSales).length})
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por código ou produto..."
                  value={searchSale}
                  onChange={(e) => setSearchSale(e.target.value)}
                  className="pl-10 bg-gray-900 text-white border-gray-700 h-9"
                />
              </div>
              <Button
                onClick={generateCodesForOldSales}
                disabled={isGeneratingCodes}
                className="bg-purple-600 hover:bg-purple-700 h-9 whitespace-nowrap"
              >
                {isGeneratingCodes ? '⏳ Gerando...' : '🔢 Gerar Códigos'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 sticky top-0">
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="text-left p-3">Código</th>
                  <th className="text-left p-3">Data/Hora</th>
                  <th className="text-left p-3">Produto</th>
                  <th className="text-center p-3">Qtd</th>
                  <th className="text-right p-3">Preço Unit.</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-center p-3">Pagamento</th>
                  <th className="text-center p-3">Banco</th>
                  <th className="text-center p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {((['santander', 'itau', 'nubank'].includes(dashBankFilter)
                  ? periodSales.filter(s => s.receiving_bank === dashBankFilter)
                  : periodSales
                ))
                  .filter(sale =>
                    !searchSale ||
                    sale.order_code?.toLowerCase().includes(searchSale.toLowerCase()) ||
                    sale.product_description?.toLowerCase().includes(searchSale.toLowerCase())
                  )
                  .map((sale) => (
                    <tr key={sale.id} className="border-b border-gray-700 hover:bg-gray-700/50 text-gray-300">
                      <td className="p-3">
                        <code className="bg-gray-900 px-2 py-1 rounded text-xs text-blue-400 font-mono">
                          {sale.order_code || 'N/A'}
                        </code>
                      </td>
                      <td className="p-3 text-xs">
                        {new Date(sale.sale_datetime).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3">{sale.product_description}</td>
                      <td className="text-center p-3 text-blue-400 font-semibold">
                        {sale.quantity_sold}
                      </td>
                      <td className="text-right p-3 text-white">
                        R$ {fmtBRL(sale.unit_price)}
                      </td>
                      <td className="text-right p-3 text-green-400 font-bold">
                        R$ {fmtBRL(sale.total_amount)}
                      </td>
                      <td className="text-center p-3">
                        <Badge className={`text-xs ${sale.payment_method === 'PIX' ? 'bg-green-600' :
                          sale.payment_method === 'DINHEIRO' ? 'bg-blue-600' :
                            sale.payment_method === 'CARTÃO DÉBITO' ? 'bg-purple-600' :
                              sale.payment_method === 'CARTÃO CRÉDITO' ? 'bg-orange-600' :
                                'bg-yellow-600'
                          }`}>
                          {sale.payment_method}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge className={`text-xs ${
                          sale.receiving_bank === 'santander' ? 'bg-red-700' :
                          sale.receiving_bank === 'itau' ? 'bg-orange-700' :
                          sale.receiving_bank === 'nubank' ? 'bg-purple-700' :
                          'bg-gray-600'
                        }`}>
                          {sale.receiving_bank === 'santander' ? '🔴 Sant.' :
                           sale.receiving_bank === 'itau' ? '🟠 Itaú' :
                           sale.receiving_bank === 'nubank' ? '🟣 Nubank' :
                           sale.receiving_bank || 'N/A'}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <div className="flex gap-1 justify-center">
                          <Button size="sm" onClick={() => handleEditSale(sale)} className="bg-blue-600 hover:bg-blue-700 h-7 px-2">✏️</Button>
                          <Button size="sm" onClick={() => cancelSale(sale)} className="bg-red-600 hover:bg-red-700 h-7 px-2">✕</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* TODOS OS PRODUTOS VENDIDOS */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5" />
            Todos os Produtos Vendidos ({(() => {
              const pm = {};
              dashSales.forEach(s => { if (!pm[s.product_id]) pm[s.product_id] = true; });
              return Object.keys(pm).length;
            })()})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Produto</th>
                  <th className="text-center p-3">Qtd Vendida</th>
                  <th className="text-left p-3">Formas de Pagamento</th>
                  <th className="text-right p-3">Faturamento</th>
                  <th className="text-right p-3">Lucro</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const productMap = {};
                  dashSales.forEach(sale => {
                    if (!productMap[sale.product_id]) {
                      productMap[sale.product_id] = { id: sale.product_id, description: sale.product_description, quantity_sold: 0, total_amount: 0, net_amount: 0, payment_methods: {} };
                    }
                    productMap[sale.product_id].quantity_sold += sale.quantity_sold || 0;
                    productMap[sale.product_id].total_amount += sale.total_amount || 0;
                    productMap[sale.product_id].net_amount += sale.net_amount || 0;
                    const method = sale.payment_method;
                    if (!productMap[sale.product_id].payment_methods[method]) productMap[sale.product_id].payment_methods[method] = 0;
                    productMap[sale.product_id].payment_methods[method] += sale.quantity_sold || 0;
                  });
                  return Object.values(productMap).sort((a, b) => b.quantity_sold - a.quantity_sold).map((product, index) => (
                    <tr key={product.id} className="border-b border-gray-700 hover:bg-gray-700/50 text-gray-300">
                      <td className="p-3 text-center">
                        <span className={`font-bold ${index === 0 ? 'text-yellow-400 text-lg' : index === 1 ? 'text-gray-300 text-lg' : index === 2 ? 'text-orange-400 text-lg' : 'text-gray-500'}`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </span>
                      </td>
                      <td className="p-3">{product.description}</td>
                      <td className="text-center p-3 text-blue-400 font-semibold">{product.quantity_sold}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(product.payment_methods).map(([method, qty]) => (
                            <Badge key={method} className={`text-xs ${method === 'PIX' ? 'bg-green-600' : method === 'DINHEIRO' ? 'bg-blue-600' : method === 'CARTÃO DÉBITO' ? 'bg-purple-600' : method === 'CARTÃO CRÉDITO' ? 'bg-orange-600' : 'bg-yellow-600'}`}>
                              {method} ({qty})
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="text-right p-3 text-green-400 font-bold">R$ {fmtBRL(product.total_amount)}</td>
                      <td className="text-right p-3 text-purple-400 font-bold">R$ {fmtBRL(product.net_amount)}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
            {dashSales.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma venda registrada ainda</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* GRÁFICO */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Faturamento por Forma de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'PIX', value: products.filter(p => p.status === 'VENDIDO PIX').reduce((sum, p) => sum + (p.sold_amount || 0), 0) },
                  { name: 'DINHEIRO', value: products.filter(p => p.status === 'VENDIDO DINHEIRO').reduce((sum, p) => sum + (p.sold_amount || 0), 0) }
                ].filter(item => item.value > 0)}
                cx="50%" cy="50%" labelLine={false}
                label={({ name, value }) => `${name}: R$ ${fmtBRL(value)}`}
                outerRadius={80} fill="#8884d8" dataKey="value"
              >
                {[{ name: 'PIX', color: '#22c55e' }, { name: 'DINHEIRO', color: '#3b82f6' }].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}