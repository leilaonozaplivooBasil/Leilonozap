import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

// 🔎 Barra de filtros da vitrine (usada no Comprar Estoque e no PDV).
// Só organiza o que já está na tela: não busca nada novo no banco.
export const ORDENS = [
  { id: 'az', label: 'Nome (A → Z)' },
  { id: 'za', label: 'Nome (Z → A)' },
  { id: 'menor', label: 'Menor preço' },
  { id: 'maior', label: 'Maior preço' },
  { id: 'estoque', label: 'Mais estoque' },
];

export default function FiltrosVitrine({
  categorias = [], categoria, onCategoria,
  ordem, onOrdem,
  precoMax, onPrecoMax,
  comFoto, onComFoto,
  total,
}) {
  const temFiltro = categoria || precoMax || comFoto || (ordem && ordem !== 'az');
  const limpar = () => { onCategoria(''); onOrdem('az'); onPrecoMax(''); onComFoto(false); };

  return (
    <div className="bg-white border border-nz-borda rounded-xl p-3 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-nz-tinta-fraca uppercase">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros
        </span>

        {categorias.length > 0 && (
          <select
            value={categoria}
            onChange={(e) => onCategoria(e.target.value)}
            className="min-h-[40px] rounded-lg border border-nz-borda bg-white px-3 text-sm outline-none focus:border-green-500"
          >
            <option value="">Todas as categorias</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        <select
          value={ordem}
          onChange={(e) => onOrdem(e.target.value)}
          className="min-h-[40px] rounded-lg border border-nz-borda bg-white px-3 text-sm outline-none focus:border-green-500"
        >
          {ORDENS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>

        <div className="flex items-center gap-1.5 min-h-[40px] rounded-lg border border-nz-borda px-3">
          <span className="text-xs text-nz-tinta-fraca">até R$</span>
          <input
            inputMode="decimal"
            value={precoMax}
            onChange={(e) => onPrecoMax(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="999"
            className="w-16 text-sm outline-none bg-transparent"
          />
        </div>

        <button
          onClick={() => onComFoto(!comFoto)}
          className={`min-h-[40px] px-3 rounded-lg border text-xs font-semibold ${comFoto ? 'border-green-500 bg-green-500/10 text-green-700' : 'border-nz-borda text-nz-tinta-fraca'}`}
        >
          Só com foto
        </button>

        {temFiltro && (
          <button onClick={limpar} className="min-h-[40px] px-3 rounded-lg text-xs font-semibold text-nz-tinta-fraca hover:text-nz-tinta flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Limpar
          </button>
        )}

        {typeof total === 'number' && (
          <span className="ml-auto text-xs text-nz-tinta-fraca">{total} produtos</span>
        )}
      </div>
    </div>
  );
}