import React from 'react';

// 🧩 Linha "rótulo → valor" do detalhamento do pedido.
// Se o valor não existir, a linha NÃO é renderizada (nada de "—" ou "NaN").
export default function LinhaDetalhe({ label, value, mono = false }) {
  if (value === null || value === undefined || value === '' || value === 0) return null;

  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-right text-white break-words ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}