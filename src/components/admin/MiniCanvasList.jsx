import React from "react";

/**
 * MiniCanvasList — versão enquadrada da Visão Geral para celular e tablet.
 *
 * Em telas estreitas o mapa em canvas fica ilegível (precisaria de ~25% de zoom),
 * então a mesma estrutura é mostrada como lista rolável, seção por seção.
 */
export default function MiniCanvasList({ sections, currentPageName, onNavigate }) {
  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 lg:hidden">
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <div
            key={section.title}
            className="rounded-2xl border border-white/10 bg-[#151921] p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              {Icon && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-emerald-300">
                  <Icon className="h-4 w-4" />
                </div>
              )}
              <span className="flex-1 truncate text-[13px] font-bold text-white">
                {section.title}
              </span>
              <span className="flex-shrink-0 text-[10px] text-gray-500">
                {(section.items || []).length}
              </span>
            </div>
            <div className="space-y-1">
              {(section.items || []).map((item) => {
                const ItemIcon = item.icon;
                const isCurrent = item.pageName === currentPageName;
                return (
                  <button
                    key={item.pageName}
                    onClick={() => onNavigate(item.pageName)}
                    className={`flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors ${
                      isCurrent
                        ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30"
                        : "text-gray-300 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {ItemIcon && <ItemIcon className="h-4 w-4 flex-shrink-0" />}
                    <span className="truncate text-[13px]">{item.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}