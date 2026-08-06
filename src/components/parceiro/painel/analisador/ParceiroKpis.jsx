import React from 'react';

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

// 📊 Cartões-resumo do analisador (mesma leitura do analisador interno).
export default function ParceiroKpis({ quantidade, valorMercado, custoTotal }) {
  const cards = [
    { label: 'Total Itens', valor: (quantidade || 0).toLocaleString('pt-BR'), cor: 'border-l-blue-500' },
    { label: 'Valor Mercado', valor: brl(valorMercado), cor: 'border-l-emerald-500' },
    { label: 'Ticket Mercado', valor: brl(quantidade ? valorMercado / quantidade : 0), cor: 'border-l-indigo-500' },
    { label: 'Custo Total', valor: brl(custoTotal), cor: 'border-l-amber-500' },
    { label: 'Custo Unit.', valor: brl(quantidade ? custoTotal / quantidade : 0), cor: 'border-l-red-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {cards.map((k) => (
        <div
          key={k.label}
          className={`rounded-xl border border-gray-700 border-l-4 bg-gray-900/80 p-4 ${k.cor}`}
        >
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            {k.label}
          </p>
          <p className="text-lg font-black text-gray-200 sm:text-xl">{k.valor}</p>
        </div>
      ))}
    </div>
  );
}