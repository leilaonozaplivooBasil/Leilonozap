import React from "react";
import { Search, X } from "lucide-react";

/**
 * AuctionSearchBar — barra de busca dos leilões (mesmo visual da Loja Virtual).
 * Filtra por título/descrição em tempo real, sem chamada de API.
 */
export default function AuctionSearchBar({ searchTerm, onSearchChange }) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="O que você procura hoje?"
          aria-label="Buscar leilões"
          className="w-full h-12 sm:h-14 pl-12 pr-10 bg-gray-800/80 border border-gray-700 rounded-2xl text-white text-base placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Limpar busca"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}