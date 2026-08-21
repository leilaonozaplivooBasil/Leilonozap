import React from 'react';
import { Package, Check } from 'lucide-react';

// 📦 Conferência item a item antes da embalagem. O estado persiste no pedido.
export default function OrderItemsChecklist({ items, packedIndices = [], onToggle }) {
  const packedSet = new Set(packedIndices);
  const conferidos = items.filter((_, idx) => packedSet.has(idx)).length;
  const todosConferidos = items.length > 0 && conferidos === items.length;

  return (
    <div className="space-y-2">
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wide ${todosConferidos ? 'text-green-400' : 'text-orange-400'}`}>
          {todosConferidos ? `✅ Produtos conferidos (${conferidos}/${items.length})` : `🔎 Conferir produtos (${conferidos}/${items.length})`}
        </p>
        <p className="mt-1 text-[10px] text-gray-400">Marque cada produto antes de avançar para Embalando.</p>
      </div>
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
              <p className={`text-[10px] ${packed ? 'text-green-400' : 'text-gray-500'}`}>{packed ? 'Conferido' : 'Pendente de conferência'}</p>
            </div>
            <span className="shrink-0 text-xs font-bold text-gray-300">Qtd: {it.qty}</span>
          </button>
        );
      })}
    </div>
  );
}