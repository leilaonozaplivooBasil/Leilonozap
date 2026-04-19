import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Activity, Package, Eye } from 'lucide-react';
import GradeItemsModal from './GradeItemsModal';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);
const COLORS = { A: '#10b981', B: '#3b82f6', C: '#eab308', D: '#f97316', E: '#ef4444', U: '#64748b' };

export default function LoteAnalysisView({ lote }) {
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [gradeModal, setGradeModal] = useState(null);

  const toggleCategory = (nome) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(nome) ? next.delete(nome) : next.add(nome);
      return next;
    });
  };

  // Parse data from LoteRecebido
  const parsed = useMemo(() => {
    let itens = [];
    if (lote.itens_json) {
      try { itens = JSON.parse(lote.itens_json); } catch {}
    }

    const quantidadeTotal = lote.quantidade_total || itens.reduce((s, i) => s + (i.qtd || i.quantidade || 1), 0);
    const valorMercadoTotal = lote.valor_mercado_total || itens.reduce((s, i) => s + (i.valor || i.valor_mercado || 0), 0);
    const custoTotal = lote.valor_lote || 0;

    // Parse custos do observacoes
    let valorArremate = 0, taxaPct = 0, taxaValor = 0, frete = 0, outros = 0;
    const obs = lote.observacoes || '';
    const matchArremate = obs.match(/Arremate:\s*R\$\s*([\d.,]+)/i);
    if (matchArremate) valorArremate = parseFloat(matchArremate[1].replace('.', '').replace(',', '.')) || 0;
    const matchTaxa = obs.match(/Taxa:\s*([\d.,]+)%/i);
    if (matchTaxa) taxaPct = parseFloat(matchTaxa[1].replace(',', '.')) || 0;
    const matchTaxaVal = obs.match(/Taxa:.*?\(R\$\s*([\d.,]+)\)/i) || obs.match(/R\$\s*([\d.,]+)\)/);
    if (matchTaxaVal) taxaValor = parseFloat(matchTaxaVal[1].replace('.', '').replace(',', '.')) || 0;
    const matchFrete = obs.match(/Frete:\s*R\$\s*([\d.,]+)/i);
    if (matchFrete) frete = parseFloat(matchFrete[1].replace('.', '').replace(',', '.')) || 0;
    const matchOutros = obs.match(/Outros:\s*R\$\s*([\d.,]+)/i);
    if (matchOutros) outros = parseFloat(matchOutros[1].replace('.', '').replace(',', '.')) || 0;

    // Build grade data
    const gradesData = { A: { qtd: 0, valorMarket: 0 }, B: { qtd: 0, valorMarket: 0 }, C: { qtd: 0, valorMarket: 0 }, D: { qtd: 0, valorMarket: 0 }, E: { qtd: 0, valorMarket: 0 }, U: { qtd: 0, valorMarket: 0 } };
    const classCount = { A: 0, B: 0, C: 0, D: 0, E: 0, U: 0 };

    itens.forEach(item => {
      const g = (item.grade || 'U').toUpperCase();
      const grade = ['A','B','C','D','E','U'].includes(g) ? g : 'U';
      const qtd = item.qtd || item.quantidade || 1;
      const valor = item.valor || item.valor_mercado || 0;
      gradesData[grade].qtd += qtd;
      gradesData[grade].valorMarket += valor;
      classCount[grade] += qtd;
    });

    // Build categories from items
    const categoriesByName = {};
    itens.forEach(item => {
      const desc = item.desc || item.descricao || 'Sem descrição';
      // We don't have categories in itens_json, so we skip department view
      // Items are shown directly in the grade view
    });

    // Projections
    const projCurto = valorMercadoTotal * 0.50;
    const projMedio = valorMercadoTotal * 0.60;
    const projLongo = valorMercadoTotal * 0.70;

    // Ticket médio por grade
    const g = gradesData;
    const qtdA = g.A.qtd, valA = g.A.valorMarket, tmA = qtdA > 0 ? valA/qtdA : 0;
    const qtdAB = g.A.qtd+g.B.qtd, valAB = g.A.valorMarket+g.B.valorMarket, tmAB = qtdAB > 0 ? valAB/qtdAB : 0;
    const qtdABC = qtdAB+g.C.qtd, valABC = valAB+g.C.valorMarket, tmABC = qtdABC > 0 ? valABC/qtdABC : 0;
    const qtdABCD = qtdABC+g.D.qtd, valABCD = valABC+g.D.valorMarket, tmABCD = qtdABCD > 0 ? valABCD/qtdABCD : 0;
    const tmALL = quantidadeTotal > 0 ? valorMercadoTotal/quantidadeTotal : 0;

    const chartData = Object.entries(classCount).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

    return {
      itens, quantidadeTotal, valorMercadoTotal, custoTotal,
      valorArremate, taxaPct, taxaValor, frete, outros,
      gradesData, classCount, chartData,
      projCurto, projMedio, projLongo,
      tmA, tmAB, tmABC, tmABCD, tmALL,
      valA, valAB, valABC, valABCD,
      qtdA, qtdAB, qtdABC, qtdABCD,
    };
  }, [lote]);

  if (!parsed || parsed.itens.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
        Nenhum detalhe de itens disponível para este lote.
      </div>
    );
  }

  const { quantidadeTotal, valorMercadoTotal, custoTotal, projCurto, projMedio, projLongo } = parsed;

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Itens", val: quantidadeTotal, fmt: false, color: "border-l-blue-500" },
          { label: "Valor Mercado", val: formatCurrency(valorMercadoTotal), fmt: true, color: "border-l-emerald-500" },
          { label: "Ticket Mercado", val: formatCurrency(quantidadeTotal ? valorMercadoTotal/quantidadeTotal : 0), fmt: true, color: "border-l-indigo-500" },
          { label: "Custo Total", val: formatCurrency(custoTotal), fmt: true, color: "border-l-amber-500" },
          { label: "Custo Unit.", val: formatCurrency(quantidadeTotal ? custoTotal/quantidadeTotal : 0), fmt: true, color: "border-l-red-500" },
        ].map((kpi, i) => (
          <div key={i} className={`bg-gray-900/80 p-4 rounded-xl border border-gray-700 border-l-4 ${kpi.color}`}>
            <p className="text-gray-500 text-[10px] font-bold mb-1 tracking-wider uppercase">{kpi.label}</p>
            <p className="text-xl font-black text-gray-200">{kpi.fmt ? kpi.val : kpi.val.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Grid: Financeiro + Projeções + Ticket */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Financeiro */}
        <div className="bg-gray-900/80 border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700/60 bg-gray-800/40">
            <h3 className="font-bold text-white text-sm flex items-center gap-2"><DollarSign size={16} className="text-amber-400" />Cenário Financeiro e Custos</h3>
          </div>
          <div className="p-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Valor Arremate</span><span className="text-white font-semibold">R$ {parsed.valorArremate.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Taxa de Leilão</span><span className="text-white font-semibold">{parsed.taxaPct}% {parsed.taxaValor > 0 ? `(R$ ${parsed.taxaValor.toFixed(2)})` : ''}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Frete</span><span className="text-white font-semibold">R$ {parsed.frete.toFixed(2)}</span></div>
            {parsed.outros > 0 && <div className="flex justify-between"><span className="text-gray-400">Outros</span><span className="text-white font-semibold">R$ {parsed.outros.toFixed(2)}</span></div>}
            <div className="flex justify-between pt-3 border-t border-gray-700">
              <span className="font-bold text-gray-300">CUSTO DO LOTE:</span>
              <span className="font-bold text-amber-400 text-base">{formatCurrency(custoTotal)}</span>
            </div>
          </div>
        </div>

        {/* Projeções */}
        <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-4">
          <h3 className="font-bold text-white mb-4 uppercase tracking-wider text-xs flex items-center gap-2"><TrendingUp size={14} className="text-indigo-400" />Cenários de Venda da Grade Útil</h3>
          <div className="space-y-2.5">
            {[
              { title: "Venda (50% do Valor Mercado)", val: projCurto, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
              { title: "Venda (60% do Valor Mercado)", val: projMedio, color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
              { title: "Venda (70% do Valor Mercado)", val: projLongo, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
            ].map((item, idx) => (
              <div key={idx} className={`flex justify-between items-center p-3 rounded-xl border ${item.color}`}>
                <p className="font-semibold text-sm">{item.title}</p>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatCurrency(item.val)}</p>
                  <p className="text-xs mt-0.5 font-medium">Lucro Bruto: {formatCurrency(item.val - custoTotal)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ticket Médio por Grade */}
        <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-4 flex flex-col">
          <h3 className="font-bold text-white mb-2 uppercase tracking-wider text-xs flex items-center gap-2"><Activity size={14} className="text-blue-400" />Análise de Ticket Médio por Grade</h3>
          <p className="text-[10px] text-gray-500 mb-4">Valor médio dos produtos agrupados por qualidade superior.</p>
          <div className="space-y-2 flex-1 flex flex-col justify-center">
            {[
              { label: "Somente Grupo A", desc: `${parsed.qtdA} produtos`, tm: parsed.tmA, val: parsed.valA, color: "border-l-blue-400", grades: ['A'] },
              { label: "Grupo A + B", desc: `${parsed.qtdAB} produtos`, tm: parsed.tmAB, val: parsed.valAB, color: "border-l-emerald-400", grades: ['A','B'] },
              { label: "Grupo A + B + C", desc: `${parsed.qtdABC} produtos`, tm: parsed.tmABC, val: parsed.valABC, color: "border-l-yellow-400", grades: ['A','B','C'] },
              { label: "Grupo A + B + C + D", desc: `${parsed.qtdABCD} produtos`, tm: parsed.tmABCD, val: parsed.valABCD, color: "border-l-orange-400", grades: ['A','B','C','D'] },
              { label: "Todos os Grupos", desc: `${quantidadeTotal} produtos`, tm: parsed.tmALL, val: valorMercadoTotal, color: "border-l-slate-400", grades: ['A','B','C','D','E','U'] },
            ].map((row, i) => (
              <div key={i} onClick={() => setGradeModal({ title: row.label, grades: row.grades })}
                className={`bg-gray-800/60 border border-gray-700/50 border-l-4 ${row.color} rounded-lg p-2.5 flex justify-between items-center cursor-pointer hover:bg-white/[0.04] transition-all group`}>
                <div>
                  <p className="font-bold text-xs text-gray-200 flex items-center gap-1.5">{row.label}<Eye size={10} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" /></p>
                  <p className="text-[10px] text-gray-500">{row.desc}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-400 text-sm">{formatCurrency(row.tm)} <span className="text-[10px] text-gray-500 font-normal">médio</span></p>
                  <p className="text-[10px] text-gray-500 uppercase">Apurado: {formatCurrency(row.val)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico de qualidade */}
      {parsed.chartData.length > 0 && (
        <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-5">
          <h3 className="font-bold text-white mb-4 uppercase tracking-wider text-xs">Distribuição de Qualidade (QTD Itens x Grade)</h3>
          <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
            <div className="w-48 h-48 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={parsed.chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {parsed.chartData.map((entry, i) => <Cell key={i} fill={COLORS[entry.name]} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} formatter={(v) => [`${v} itens`, 'Quantidade']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 w-full">
              {parsed.chartData.map((d, i) => (
                <div key={i} className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[d.name] }} />
                    <span className="text-xs font-bold text-gray-300">Grade {d.name}</span>
                  </div>
                  <span className="font-black text-white text-sm">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lista de itens por grade */}
      <div className="bg-gray-900/80 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700/60 bg-gray-800/40">
          <h3 className="text-sm font-semibold text-white">Itens do Lote ({parsed.itens.length} tipos)</h3>
        </div>
        <div className="divide-y divide-gray-700/30 max-h-96 overflow-y-auto">
          {parsed.itens.slice(0, 100).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between px-4 py-2 hover:bg-gray-700/20 transition-colors">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {item.grade && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                    item.grade === 'A' ? 'bg-emerald-500/20 text-emerald-300' :
                    item.grade === 'B' ? 'bg-blue-500/20 text-blue-300' :
                    item.grade === 'C' ? 'bg-yellow-500/20 text-yellow-300' :
                    item.grade === 'D' ? 'bg-orange-500/20 text-orange-300' :
                    item.grade === 'E' ? 'bg-red-500/20 text-red-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>{item.grade}</span>
                )}
                <span className="text-sm text-gray-200 truncate">{item.desc || item.descricao || 'Item'}</span>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                <span className="text-xs text-gray-400">Qtd: <span className="text-white font-semibold">{item.qtd || item.quantidade || 1}</span></span>
                {(item.valor || item.valor_mercado) > 0 && (
                  <span className="text-xs text-purple-400">Mkt: {formatCurrency(item.valor || item.valor_mercado || 0)}</span>
                )}
              </div>
            </div>
          ))}
          {parsed.itens.length > 100 && (
            <div className="px-4 py-2 text-center text-xs text-gray-500">... e mais {parsed.itens.length - 100} itens</div>
          )}
        </div>
      </div>

      {gradeModal && (
        <GradeItemsModal isOpen={true} onClose={() => setGradeModal(null)} title={gradeModal.title} grades={gradeModal.grades} items={parsed.itens.map(i => ({ grade: i.grade || 'U', desc: i.desc || i.descricao || 'Item', qtd: i.qtd || i.quantidade || 1, valor: i.valor || i.valor_mercado || 0 }))} />
      )}
    </div>
  );
}