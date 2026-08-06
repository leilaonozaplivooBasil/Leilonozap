import React from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const CORES = { A: '#10b981', B: '#3b82f6', C: '#eab308', D: '#f97316', E: '#ef4444', U: '#64748b' };

// 🍩 Distribuição de qualidade por grade — cores idênticas ao analisador interno.
export default function ParceiroRoscaQualidade({ grades }) {
  const dados = Object.entries(grades || {})
    .filter(([, v]) => (v?.qtd || 0) > 0)
    .map(([name, v]) => ({ name, value: v.qtd }));

  if (dados.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/80 p-5">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">
        Distribuição de Qualidade (QTD Itens x Grade)
      </h3>
      <div className="flex flex-col items-center justify-center gap-6 md:flex-row">
        <div className="h-48 w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dados}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {dados.map((d) => (
                  <Cell key={d.name} fill={CORES[d.name]} />
                ))}
              </Pie>
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#0d1117',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                formatter={(v) => [`${v} itens`, 'Quantidade']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 lg:grid-cols-3">
          {dados.map((d) => (
            <div
              key={d.name}
              className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-800/60 p-2.5"
            >
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CORES[d.name] }} />
                <span className="text-xs font-bold text-gray-300">Grade {d.name}</span>
              </div>
              <span className="text-sm font-black text-white">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}