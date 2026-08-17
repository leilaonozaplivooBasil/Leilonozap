import React from 'react';
import { Package, Check } from 'lucide-react';

// 📦 Card por produto (não só descrição em texto) — a logística clica na caixinha
// pra marcar que já separou/embalou aquele item. Estado persiste no pedido.
export default function OrderItemsChecklist({ items, packedIndices = [], onToggle }) {
  const packedSet = new Set(packedIndices);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide">
        📦 Itens do pedido ({items.length}) — marque ao separar
      </p>
      {items.map((it, idx) => {
        const packed = packedSet.has(idx);
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onToggle(idx)}
            className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
              packed ? 'border-green-500/50 bg-green-500/10' : 'border-gray-600 bg-gray-700/50 hover:bg-gray-700'
            }`}
          >
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 ${
              packed ? 'border-green-500 bg-green-500' : 'border-gray-500'
            }`}>
              {packed && <Check className="h-4 w-4 text-white" />}
            </span>
            <Package className={`h-5 w-5 shrink-0 ${packed ? 'text-green-400' : 'text-gray-400'}`} />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${packed ? 'text-green-300 line-through' : 'text-white'}`}>{it.title}</p>
            </div>
            <span className="shrink-0 text-xs font-bold text-gray-300">Qtd: {it.qty}</span>
          </button>
        );
      })}
    </div>
  );
}