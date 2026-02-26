import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DollarSign, Package, TrendingUp, TrendingDown, BarChart3, ArrowLeft, Percent, Target, Wallet, Pencil, Check, X
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

const fmtBRL = (v) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (v) => (v || 0).toFixed(2);

export default function RentabilidadeOperacao({ sales, products, onBack }) {
  const [editingInvestido, setEditingInvestido] = useState(false);
  const [customInvestido, setCustomInvestido] = useState(() => {
    const saved = localStorage.getItem('rentabilidade_custom_investido');
    return saved !== null ? parseFloat(saved) : null;
  });
  const [inputInvestido, setInputInvestido] = useState('');

  const saveCustomInvestido = (val) => {
    setCustomInvestido(val);
    if (val !== null) {
      localStorage.setItem('rentabilidade_custom_investido', String(val));
    } else {
      localStorage.removeItem('rentabilidade_custom_investido');
    }
  };

  const stats = React.useMemo(() => {
    // Total de produtos (estoque + vendidos)
    const totalProducts = products.reduce((sum, p) => sum + (p.quantity || 0) + (p.quantity_sold || 0), 0);
    const totalProductsInStock = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalProductsSold = sales.reduce((sum, s) => sum + (s.quantity_sold || 0), 0);

    // Valor investido = customizado ou calculado
    const valorInvestidoCalculado = products.reduce((sum, p) => {
      const totalQty = (p.quantity || 0) + (p.quantity_sold || 0);
      return sum + (p.cost_price || 0) * totalQty;
    }, 0);
    const valorInvestido = customInvestido !== null ? customInvestido : valorInvestidoCalculado;

    // Faturamento = soma dos total_amount das vendas
    const faturamentoTotal = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

    // Custo dos produtos vendidos
    const custoVendidos = sales.reduce((sum, s) => {
      return sum + (s.product_cost || 0) * (s.quantity_sold || 1);
    }, 0);

    // Impostos e comissões
    const totalImpostos = sales.reduce((sum, s) => sum + (s.total_taxes || 0), 0);
    const totalComissoes = sales.reduce((sum, s) => sum + (s.commission_amount || 0), 0);

    // Lucro líquido atual
    const lucroLiquido = sales.reduce((sum, s) => sum + (s.net_amount || 0), 0);

    // VUP (Valor Unitário de Produto) = investimento total / total de produtos
    const vup = totalProducts > 0 ? valorInvestido / totalProducts : 0;

    // Percentual de lucro atual = (lucro / faturamento) * 100
    const percentualLucro = faturamentoTotal > 0 ? (lucroLiquido / faturamentoTotal) * 100 : 0;

    // ROI atual = (lucro / investimento) * 100
    const roiAtual = valorInvestido > 0 ? (lucroLiquido / valorInvestido) * 100 : 0;

    // Projeção: se vendesse TODO o estoque restante pelo preço médio de venda
    const precoMedioVenda = totalProductsSold > 0 ? faturamentoTotal / totalProductsSold : 0;
    const faturamentoProjetado = faturamentoTotal + (totalProductsInStock * precoMedioVenda);

    // Custo projetado de todo estoque
    const custoTotalProjetado = valorInvestido;

    // Margem média líquida
    const margemMediaLiquida = totalProductsSold > 0 ? lucroLiquido / totalProductsSold : 0;
    const lucroProjetado = lucroLiquido + (totalProductsInStock * margemMediaLiquida);

    // Percentual de lucro projetado
    const percentualLucroProjetado = faturamentoProjetado > 0 ? (lucroProjetado / faturamentoProjetado) * 100 : 0;

    // ROI projetado
    const roiProjetado = valorInvestido > 0 ? (lucroProjetado / valorInvestido) * 100 : 0;

    // Percentual vendido
    const percentualVendido = totalProducts > 0 ? (totalProductsSold / totalProducts) * 100 : 0;

    return {
      totalProducts,
      totalProductsInStock,
      totalProductsSold,
      valorInvestido,
      faturamentoTotal,
      custoVendidos,
      totalImpostos,
      totalComissoes,
      lucroLiquido,
      vup,
      percentualLucro,
      roiAtual,
      faturamentoProjetado,
      lucroProjetado,
      percentualLucroProjetado,
      roiProjetado,
      percentualVendido,
    };
  }, [sales, products, customInvestido]);

  const chartData = [
    { name: 'Investido', value: stats.valorInvestido, color: '#f59e0b' },
    { name: 'Faturado', value: stats.faturamentoTotal, color: '#22c55e' },
    { name: 'Custos', value: stats.custoVendidos, color: '#ef4444' },
    { name: 'Imp+Com', value: stats.totalImpostos + stats.totalComissoes, color: '#f97316' },
    { name: 'Lucro', value: stats.lucroLiquido, color: '#a855f7' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button onClick={onBack} size="sm" variant="ghost" className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            Rentabilidade da Operação
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Análise completa de investimento, retorno e projeções</p>
        </div>
      </div>

      {/* CARDS PRINCIPAIS - Linha 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gray-800 border-amber-600/30 cursor-pointer hover:border-amber-500/50 transition-colors" onClick={() => {
          if (!editingInvestido) {
            setInputInvestido(String(stats.valorInvestido.toFixed(2)).replace('.', ','));
            setEditingInvestido(true);
          }
        }}>
          <CardContent className="p-4">
            <p className="text-amber-400 text-xs mb-1 flex items-center gap-1">
              <Wallet className="w-3 h-3" /> Valor Investido
              {!editingInvestido && <Pencil className="w-3 h-3 ml-1 text-gray-500" />}
            </p>
            {editingInvestido ? (
              <div className="flex items-center gap-1 mt-1" onClick={e => e.stopPropagation()}>
                <span className="text-white text-sm font-bold">R$</span>
                <Input
                  autoFocus
                  value={inputInvestido}
                  onChange={e => setInputInvestido(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = parseFloat(inputInvestido.replace(/\./g, '').replace(',', '.'));
                      if (!isNaN(val) && val >= 0) setCustomInvestido(val);
                      setEditingInvestido(false);
                    }
                    if (e.key === 'Escape') {
                      setEditingInvestido(false);
                    }
                  }}
                  className="bg-gray-900 border-amber-600/50 text-white h-8 text-lg font-bold w-full"
                  placeholder="0,00"
                />
                <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400 hover:text-emerald-300" onClick={() => {
                  const val = parseFloat(inputInvestido.replace(/\./g, '').replace(',', '.'));
                  if (!isNaN(val) && val >= 0) setCustomInvestido(val);
                  setEditingInvestido(false);
                }}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => {
                  setCustomInvestido(null);
                  setEditingInvestido(false);
                }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <p className="text-2xl font-bold text-white">R$ {fmtBRL(stats.valorInvestido)}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalProducts.toLocaleString('pt-BR')} produtos
              {customInvestido !== null && <span className="text-amber-400 ml-1">(editado)</span>}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-emerald-600/30">
          <CardContent className="p-4">
            <p className="text-emerald-400 text-xs mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Faturamento Total</p>
            <p className="text-2xl font-bold text-emerald-400">R$ {fmtBRL(stats.faturamentoTotal)}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.totalProductsSold.toLocaleString('pt-BR')} un. vendidas</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-blue-600/30">
          <CardContent className="p-4">
            <p className="text-blue-400 text-xs mb-1 flex items-center gap-1"><Package className="w-3 h-3" /> Qtd de Produtos</p>
            <p className="text-2xl font-bold text-white">{stats.totalProducts.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.totalProductsInStock.toLocaleString('pt-BR')} em estoque</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-cyan-600/30">
          <CardContent className="p-4">
            <p className="text-cyan-400 text-xs mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> VUP (Valor Unit.)</p>
            <p className="text-2xl font-bold text-white">R$ {fmtBRL(stats.vup)}</p>
            <p className="text-xs text-gray-500 mt-1">custo médio por unidade</p>
          </CardContent>
        </Card>
      </div>

      {/* CARDS - Linha 2: Lucro atual */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="bg-gray-800 border-purple-600/30">
          <CardContent className="p-4">
            <p className="text-purple-400 text-xs mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Lucro Líquido Atual</p>
            <p className={`text-2xl font-bold ${stats.lucroLiquido >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
              R$ {fmtBRL(stats.lucroLiquido)}
            </p>
            <p className="text-xs text-gray-500 mt-1">após impostos e comissões</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-green-600/30">
          <CardContent className="p-4">
            <p className="text-green-400 text-xs mb-1 flex items-center gap-1"><Percent className="w-3 h-3" /> % Lucro Atual</p>
            <p className={`text-2xl font-bold ${stats.percentualLucro >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtPct(stats.percentualLucro)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">lucro / faturamento</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-orange-600/30">
          <CardContent className="p-4">
            <p className="text-orange-400 text-xs mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> ROI Atual</p>
            <p className={`text-2xl font-bold ${stats.roiAtual >= 0 ? 'text-orange-400' : 'text-red-400'}`}>
              {fmtPct(stats.roiAtual)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">retorno sobre investimento</p>
          </CardContent>
        </Card>
      </div>

      {/* PROJEÇÃO */}
      <Card className="bg-gradient-to-r from-gray-800 to-gray-800/80 border-emerald-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            Projeção (se vender todo estoque)
          </CardTitle>
          <p className="text-xs text-gray-400">
            Baseado na margem média das vendas atuais · {fmtPct(stats.percentualVendido)}% já vendido
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-900/60 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Faturamento Projetado</p>
              <p className="text-lg font-bold text-emerald-400">R$ {fmtBRL(stats.faturamentoProjetado)}</p>
            </div>
            <div className="bg-gray-900/60 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Lucro Projetado</p>
              <p className={`text-lg font-bold ${stats.lucroProjetado >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                R$ {fmtBRL(stats.lucroProjetado)}
              </p>
            </div>
            <div className="bg-gray-900/60 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">% Lucro Projetado</p>
              <p className={`text-lg font-bold ${stats.percentualLucroProjetado >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmtPct(stats.percentualLucroProjetado)}%
              </p>
            </div>
            <div className="bg-gray-900/60 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">ROI Projetado</p>
              <p className={`text-lg font-bold ${stats.roiProjetado >= 0 ? 'text-orange-400' : 'text-red-400'}`}>
                {fmtPct(stats.roiProjetado)}%
              </p>
            </div>
          </div>

          {/* Barra de progresso de vendas */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progresso de vendas</span>
              <span>{fmtPct(stats.percentualVendido)}% vendido</span>
            </div>
            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.percentualVendido, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{stats.totalProductsSold.toLocaleString('pt-BR')} vendidos</span>
              <span>{stats.totalProductsInStock.toLocaleString('pt-BR')} em estoque</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GRÁFICO COMPARATIVO */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Visão Geral Financeira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => [`R$ ${fmtBRL(value)}`, '']}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}