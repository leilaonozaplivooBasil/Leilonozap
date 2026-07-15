import React from "react";
import { Search, SlidersHorizontal } from "lucide-react";

/**
 * CatalogSearchBar — busca protagonista + botão Filtros discreto.
 * A busca é a estrela; Filtros é auxiliar (border-1, texto menor).
 */
export default function CatalogSearchBar({
  searchTerm,
  onSearchChange,
  showFilters,
  onToggleFilters,
}) {
  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-3">
      <div className="relative flex-1 max-w-2xl w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="O que você procura hoje?"
          aria-label="Buscar produtos"
          className="w-full h-12 sm:h-14 pl-12 pr-4 bg-gray-800/80 border border-gray-700 rounded-2xl text-white text-base placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
      </div>

      <button
        type="button"
        onClick={onToggleFilters}
        aria-pressed={showFilters}
        className={`inline-flex items-center justify-center gap-1.5 h-11 sm:h-12 px-4 rounded-xl border font-medium text-sm transition-all flex-shrink-0 ${
          showFilters
            ? "border-emerald-500 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15"
            : "border-gray-800 text-gray-400 bg-gray-800/40 hover:border-gray-600 hover:text-white"
        }`}
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span>Filtros</span>
      </button>
    </div>
  );
}