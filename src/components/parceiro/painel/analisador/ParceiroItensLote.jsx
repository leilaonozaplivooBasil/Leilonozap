import React, { useState } from 'react';

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const SELO = {
  A: 'bg-emerald-500/20 text-emerald-300',
  B: 'bg-blue-500/20 text-blue-300',
  C: 'bg-yellow-500/20 text-yellow-300',
  D: 'bg-orange-500/20 text-orange-300',
  E: 'bg-red-500/20 text-red-300',
  U: 'bg-gray-500/20 text-gray-300',
};

// 📦 Lista de itens do lote com selo de grade colorido, Qtd e valor de mercado.
export default function ParceiroItensLote({ itens }) {
  const [limite, setLimite] = useState(100);
  if (!itens || itens.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900/80">
      <div className="border-b border-gray-700/60 bg-gray-800/40 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Itens do Lote ({itens.length} tipos)</h3>
      </div>
      <div className="max-h-96 divide-y divide-gray-700/30 overflow-y-auto">
        {itens.slice(0, limite).map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-4 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${
                  SELO[item.grade] || SELO.U
                }`}
              >
                {item.grade || 'U'}
              </span>
              <span className="truncate text-xs text-gray-200 sm:text-sm">{item.desc}</span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-[11px] text-gray-400">
                Qtd: <span className="font-semibold text-white">{item.qtd}</span>
              </span>
              {item.valor > 0 && (
                <span className="hidden text-[11px] text-purple-400 sm:inline">
                  Mkt: {brl(item.valor)}
                </span>
              )}
            </div>
          </div>
        ))}
        {itens.length > limite && (
          <button
            type="button"
            onClick={() => setLimite((l) => l + 200)}
            className="min-h-[44px] w-full px-4 py-2 text-center text-xs font-bold text-pc-ouro"
          >
            Ver mais {itens.length - limite} itens
          </button>
        )}
      </div>
    </div>
  );
}