import React from "react";

/**
 * CatalogCategoriesBar — barra de categorias em linha (texto flat).
 * Substitui os círculos coloridos.
 *
 * Ativa: underline verde NoZap + font-semibold + text-white
 * Inativa: text-slate-400 hover:text-white
 * Mobile: overflow horizontal com scroll suave.
 */
export default function CatalogCategoriesBar({
  categories = [],
  selectedCategory = "all",
  onSelectCategory,
}) {
  if (!categories || categories.length === 0) return null;

  const items = [{ id: "all", name: "Todos" }, ...categories];

  return (
    <nav
      aria-label="Categorias"
      className="w-full overflow-x-auto scrollbar-hide"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="flex items-center gap-6 sm:gap-8 py-3 min-w-max px-1">
        {items.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`relative whitespace-nowrap text-sm sm:text-base py-2 transition-colors ${
                isActive
                  ? "font-semibold text-white border-b-2 border-emerald-500"
                  : "font-medium text-slate-400 hover:text-white border-b-2 border-transparent"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}