import React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * CatalogSearchBar — busca protagonista + botão Filtros.
 * Layout: input gigante centralizado + botão outline ao lado.
 * Toda a lógica de busca continua sendo estado do Catalog.jsx.
 */
export default function CatalogSearchBar({
  searchTerm,
  onSearchChange,
  showFilters,
  onToggleFilters,
}) {
  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3">
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

      <Button
        type="button"
        onClick={onToggleFilters}
        aria-pressed={showFilters}
        variant="outline"
        className={`h-12 sm:h-14 px-5 rounded-2xl border-2 font-bold text-base transition-all flex-shrink-0 ${
          showFilters
            ? "border-emerald-500 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15"
            : "border-gray-700 text-gray-300 bg-gray-800/40 hover:border-emerald-500/50 hover:text-white"
        }`}
      >
        <SlidersHorizontal className="w-5 h-5 mr-2" />
        <span>Filtros</span>
      </Button>
    </div>
  );
}