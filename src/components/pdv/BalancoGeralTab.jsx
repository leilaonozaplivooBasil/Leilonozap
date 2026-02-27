import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, Receipt, Percent, BarChart3, Pencil, Check, Scale
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie } from 'recharts';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const fmtBRL = (v) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (v) => (v || 0).toFixed(2);

export default function BalancoGeralTab({ sales, products, customInvestido }) {
  const { data: expenses = [] } = useQuery({
    queryKey: ['financial_expenses_balanco'],
    queryFn: () => base44.entities.FinancialExpense.list('-due_date', 500),
    initialData: [],
  });

  const stats = React.useMemo(() => {
    // RECEITAS
    const faturamentoPDV = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const impostosPDV = sales.reduce((sum, s) => sum + (s.total_taxes || 0), 0);
    const comissoesPDV = sales.reduce((sum, s) => sum + (s.commission_amount || 0), 0);
    const lucroLiquidoPDV = sales.reduce((sum, s) => sum + (s.net_amount || 0), 0);

    // CUSTOS DOS PRODUTOS VENDIDOS
    const custoProdutosVendidos = sales.reduce((sum, s) => {
      return sum + (s.product_cost || 0) * (s.quantity_sold || 1);
    }, 0);

    // VALOR DO ESTOQUE ATUAL - usa mesma lógica da aba Rentabilidade (valor investido customizado ou calculado)
    const valorInvestidoCalculado = products.reduce((sum, p) => {
      const totalQty = (p.quantity || 0) + (p.quantity_sold || 0);
      return sum + (p.cost_price || 0) * totalQty;
    }, 0);
    const valorEstoqueAtual = customInvestido !== null && customInvestido !== undefined ? customInvestido : valorInvestidoCalculado;

    // DESPESAS FIXAS E VARIÁVEIS
    const despesasPagas = expenses
      .filter(e => e.payment_status === 'pago_integral' || e.payment_status === 'pago_parcial')
      .reduce((sum, e) => sum + (e.amount_paid || e.total_amount || e.amount || 0), 0);
    
    const despesasPendentes = expenses
      .filter(e => e.payment_status === 'pendente' || e.payment_status === 'vencido')
      .reduce((sum, e) => sum + (e.total_amount || e.amount || 0), 0);

    const despesasFixas = expenses
      .filter(e => e.expense_type === 'fixo')
      .reduce((sum, e) => sum + (e.total_amount || e.amount || 0), 0);

    const despesasUnicas = expenses
      .filter(e => e.expense_type === 'unico' || e.expense_type === 'parcelado')
      .reduce((sum, e) => sum + (e.total_amount || e.amount || 0), 0);

    const totalDespesas = despesasPagas + despesasPendentes;

    // BALANÇO GERAL
    const receitaTotal = faturamentoPDV;
    const custoTotal = custoProdutosVendidos + impostosPDV + comissoesPDV;
    const lucroBrutoPDV = faturamentoPDV - custoProdutosVendidos;
    const resultadoOperacional = lucroLiquidoPDV - despesasPagas;
    const margemLiquida = faturamentoPDV > 0 ? (resultadoOperacional / faturamentoPDV) * 100 : 0;

    // Categorias de despesas
    const despesasPorCategoria = {};
    expenses.forEach(e => {
      const cat = e.category || 'Sem categoria';
      if (!despesasPorCategoria[cat]) despesasPorCategoria[cat] = 0;
      despesasPorCategoria[cat] += (e.total_amount || e.amount || 0);
    });

    return {
      faturamentoPDV,
      impostosPDV,
      comissoesPDV,
      lucroLiquidoPDV,
      custoProdutosVendidos,
      valorEstoqueAtual,
      despesasPagas,
      despesasPendentes,
      despesasFixas,
      despesasUnicas,
      totalDespesas,
      receitaTotal,
      custoTotal,
      lucroBrutoPDV,
      resultadoOperacional,
      margemLiquida,
      despesasPorCategoria,
    };
  }, [sales, products, expenses]);

  const balancoChartData = [
    { name: 'Faturamento', value: stats.faturamentoPDV, color: '#22c55e' },
    { name: 'Custo Prod.', value: stats.custoProdutosVendidos, color: '#ef4444' },
    { name: 'Impostos', value: stats.impostosPDV, color: '#f97316' },
    { name: 'Comissões', value: stats.comissoesPDV, color: '#eab308' },
    { name: 'Despesas Pagas', value: stats.despesasPagas, color: '#8b5cf6' },
    { name: 'Resultado', value: stats.resultadoOperacional, color: stats.resultadoOperacional >= 0 ? '#10b981' : '#ef4444' },
  ];

  const despesasCatData = Object.entries(stats.despesasPorCategoria)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      color: ['#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#ef4444', '#22c55e', '#3b82f6', '#f97316'][i % 8]
    }));

  return (
    <div className="space-y-6">
      {/* RESUMO GERAL */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gray-800 border-emerald-600/30">
          <CardContent className="p-4">
            <p className="text-emerald-400 text-xs mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Faturamento Total
            </p>
            <p className="text-2xl font-bold text-emerald-400">R$ {fmtBRL(stats.faturamentoPDV)}</p>
            <p className="text-xs text-gray-500 mt-1">receita bruta do PDV</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-red-600/30">
          <CardContent className="p-4">
            <p className="text-red-400 text-xs mb-1 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> Custos Totais
            </p>
            <p className="text-2xl font-bold text-red-400">R$ {fmtBRL(stats.custoTotal)}</p>
            <p className="text-xs text-gray-500 mt-1">produtos + impostos + comissões</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-purple-600/30">
          <CardContent className="p-4">
            <p className="text-purple-400 text-xs mb-1 flex items-center gap-1">
              <Receipt className="w-3 h-3" /> Despesas Operacionais
            </p>
            <p className="text-2xl font-bold text-purple-400">R$ {fmtBRL(stats.despesasPagas)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.despesasPendentes > 0 && <span className="text-amber-400">+ R$ {fmtBRL(stats.despesasPendentes)} pendentes</span>}
              {stats.despesasPendentes === 0 && 'despesas pagas'}
            </p>
          </CardContent>
        </Card>

        <Card className={`bg-gray-800 ${stats.resultadoOperacional >= 0 ? 'border-emerald-600/30' : 'border-red-600/30'}`}>
          <CardContent className="p-4">
            <p className={`text-xs mb-1 flex items-center gap-1 ${stats.resultadoOperacional >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <Scale className="w-3 h-3" /> Resultado Operacional
            </p>
            <p className={`text-2xl font-bold ${stats.resultadoOperacional >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              R$ {fmtBRL(stats.resultadoOperacional)}
            </p>
            <p className="text-xs text-gray-500 mt-1">lucro líquido - despesas pagas</p>
          </CardContent>
        </Card>
      </div>

      {/* DETALHAMENTO */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <p className="text-orange-400 text-xs mb-1 flex items-center gap-1">
              <Receipt className="w-3 h-3" /> Impostos
            </p>
            <p className="text-xl font-bold text-orange-400">R$ {fmtBRL(stats.impostosPDV)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <p className="text-yellow-400 text-xs mb-1 flex items-center gap-1">
              <Wallet className="w-3 h-3" /> Comissões
            </p>
            <p className="text-xl font-bold text-yellow-400">R$ {fmtBRL(stats.comissoesPDV)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <p className="text-cyan-400 text-xs mb-1 flex items-center gap-1">
              <Percent className="w-3 h-3" /> Margem Líquida
            </p>
            <p className={`text-xl font-bold ${stats.margemLiquida >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
              {fmtPct(stats.margemLiquida)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ESTOQUE E DESPESAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-400" /> Valor em Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-400">R$ {fmtBRL(stats.valorEstoqueAtual)}</p>
            <p className="text-xs text-gray-500 mt-1">valor de custo dos produtos em estoque</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-purple-400" /> Despesas por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900/60 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Fixas (mensais)</p>
                <p className="text-lg font-bold text-purple-400">R$ {fmtBRL(stats.despesasFixas)}</p>
              </div>
              <div className="bg-gray-900/60 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Únicas/Parceladas</p>
                <p className="text-lg font-bold text-pink-400">R$ {fmtBRL(stats.despesasUnicas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GRÁFICO BALANÇO */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Balanço Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={balancoChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => [`R$ ${fmtBRL(value)}`, '']}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {balancoChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* GRÁFICO DESPESAS POR CATEGORIA */}
      {despesasCatData.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Despesas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={despesasCatData}
                    cx="50%" cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {despesasCatData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                    formatter={(value) => [`R$ ${fmtBRL(value)}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {despesasCatData.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-900/50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm text-gray-300">{cat.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">R$ {fmtBRL(cat.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}