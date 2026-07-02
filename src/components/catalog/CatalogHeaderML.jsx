import React, { useState } from "react";
import { Search, MoreVertical, MessageCircle, SlidersHorizontal } from "lucide-react";
import CatalogPanelDrawer from "./CatalogPanelDrawer";

/**
 * CatalogHeaderML — Header do catálogo estilo Mercado Livre
 * - Card branco com sombra sutil
 * - Busca gigante central
 * - Chips de categorias abaixo da busca (scroll horizontal em mobile)
 * - Botão ⋮ à direita que abre drawer com painéis do usuário
 * - Informação do licenciado (nome + foto + Falar Comigo)
 *
 * Props (todas passthrough — nenhuma lógica de negócio aqui):
 *   searchTerm, setSearchTerm
 *   categories, selectedCategory, setSelectedCategory
 *   licenseeData (opcional): { name, photo, phone }
 *   currentUser
 *   showFilters, setShowFilters
 */
export default function CatalogHeaderML({
    searchTerm,
    setSearchTerm,
    categories = [],
    selectedCategory,
    setSelectedCategory,
    licenseeData,
    currentUser,
    showFilters,
    setShowFilters,
}) {
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* LINHA 1 — Info licenciado (se houver) */}
                {licenseeData && (
                    <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50/60 to-white">
                        {licenseeData.photo ? (
                            <img
                                src={licenseeData.photo}
                                alt={licenseeData.name}
                                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-emerald-500/30 flex-shrink-0"
                            />
                        ) : (
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                                {licenseeData.name?.charAt(0) || 'L'}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700/80">
                                Loja Virtual de
                            </p>
                            <h2 className="text-sm sm:text-base font-black text-gray-900 truncate">
                                {licenseeData.name}
                            </h2>
                        </div>
                        {licenseeData.phone && (
                            <a
                                href={`https://wa.me/55${licenseeData.phone.replace(/\D/g, '')}?text=Olá ${licenseeData.name}! Estou vendo sua loja virtual personalizada.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors flex-shrink-0 shadow-sm"
                                title={`Falar com ${licenseeData.name}`}
                            >
                                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Falar Comigo</span>
                            </a>
                        )}
                    </div>
                )}

                {/* LINHA 2 — Busca gigante + Filtros + Menu ⋮ */}
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4">
                    {/* Input busca */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar produtos, marcas e muito mais..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-11 sm:h-12 pl-10 sm:pl-12 pr-3 sm:pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        />
                    </div>

                    {/* Botão Filtros */}
                    <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`h-11 sm:h-12 px-3 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center gap-1.5 flex-shrink-0 border ${
                            showFilters
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                        title="Filtros"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span className="hidden sm:inline">Filtros</span>
                    </button>

                    {/* Menu ⋮ — abre drawer de painéis */}
                    <button
                        type="button"
                        onClick={() => setDrawerOpen(true)}
                        className="h-11 sm:h-12 w-11 sm:w-12 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 transition-all flex items-center justify-center flex-shrink-0"
                        aria-label="Meus painéis"
                        title="Meus painéis"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>

                {/* LINHA 3 — Chips de categoria (scroll horizontal em mobile) */}
                {categories.length > 0 && (
                    <div className="border-t border-gray-100 px-3 sm:px-6 py-2.5 sm:py-3">
                        <div className="flex gap-2 overflow-x-auto scrollbar-none">
                            <button
                                type="button"
                                onClick={() => setSelectedCategory("all")}
                                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                                    selectedCategory === "all"
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Todos
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                                        selectedCategory === cat.id
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Drawer lateral direito com painéis */}
            <CatalogPanelDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                currentUser={currentUser}
            />

            <style>{`
                .scrollbar-none::-webkit-scrollbar { display: none; }
                .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </>
    );
}