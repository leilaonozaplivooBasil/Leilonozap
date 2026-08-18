import React from 'react';
import { SlidersHorizontal, X, ImageIcon } from 'lucide-react';

// 🔎 Barra de filtros da vitrine (usada no Comprar Estoque e no PDV).
// Só organiza o que já está na tela: não busca nada novo no banco.
export const ORDENS = [
  { id: 'az', label: 'Nome (A → Z)' },
  { id: 'za', label: 'Nome (Z → A)' },
  { id: 'menor', label: 'Menor preço' },
  { id: 'maior', label: 'Maior preço' },
  { id: 'estoque', label: 'Mais estoque' },
];

const campoBase = 'w-full min-h-[42px] rounded-lg border border-nz-borda bg-white px-3 text-sm outline-none focus:border-green-500';
const rotuloBase = 'block text-[10.5px] font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1';

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
    <div className="bg-white border border-nz-borda rounded-2xl p-4 mb-4">
      {/* cabeçalho do card: título à esquerda, contagem + limpar à direita */}
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-1.5 text-xs font-bold text-nz-tinta uppercase tracking-wide">
          <SlidersHorizontal className="w-4 h-4 text-nz-verde" /> Filtros
        </span>
        <div className="flex items-center gap-3">
          {typeof total === 'number' && (
            <span className="text-xs text-nz-tinta-fraca">{total} produtos</span>
          )}
          {temFiltro && (
            <button onClick={limpar} className="text-xs font-semibold text-nz-tinta-fraca hover:text-red-500 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* controles em grade, cada um com rótulo próprio — organiza o que antes
          era uma fileira solta de campos sem identificação */}
      <div className={`grid grid-cols-2 gap-2.5 ${categorias.length > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        {categorias.length > 0 && (
          <div className="col-span-2 sm:col-span-1">
            <label className={rotuloBase}>Categoria</label>
            <select value={categoria} onChange={(e) => onCategoria(e.target.value)} className={campoBase}>
              <option value="">Todas</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className={rotuloBase}>Ordenar por</label>
          <select value={ordem} onChange={(e) => onOrdem(e.target.value)} className={campoBase}>
            {ORDENS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className={rotuloBase}>Preço até</label>
          <div className="flex items-center gap-1.5 min-h-[42px] rounded-lg border border-nz-borda bg-white px-3">
            <span className="text-xs text-nz-tinta-fraca">R$</span>
            <input
              inputMode="decimal"
              value={precoMax}
              onChange={(e) => onPrecoMax(e.target.value.replace(/[^\d.,]/g, ''))}
              placeholder="999"
              className="w-full text-sm outline-none bg-transparent"
            />
          </div>
        </div>

        <div>
          <label className={rotuloBase}>Foto</label>
          <button
            onClick={() => onComFoto(!comFoto)}
            className={`w-full min-h-[42px] px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${comFoto ? 'border-green-500 bg-green-500/10 text-green-700' : 'border-nz-borda text-nz-tinta-fraca'}`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Só com foto
          </button>
        </div>
      </div>
    </div>
  );
}