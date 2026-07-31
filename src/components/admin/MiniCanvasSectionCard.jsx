import React from "react";
import { ChevronRight } from "lucide-react";

/**
 * MiniCanvasSectionCard — cartão de seção da Visão Geral no celular.
 * Só visual + toque: quem manda no que abre é o MiniCanvasList.
 */
export default function MiniCanvasSectionCard({ section, isActive, onOpen }) {
  const Icon = section.icon;
  const total = (section.items || []).length;
  return (
    <button
      onClick={onOpen}
      className={`flex min-h-[92px] w-full flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-colors ${
        isActive
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-white/10 bg-[#151921] active:bg-[#1a1f2b]"
      }`}
    >
      <div className="flex w-full items-center gap-2">
        {Icon && (
          <div
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
              isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-white/[0.05] text-emerald-300/80"
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
        <ChevronRight className="ml-auto h-4 w-4 flex-shrink-0 text-gray-600" />
      </div>
      <span className="w-full break-words text-[13px] font-bold leading-tight text-white">
        {section.title}
      </span>
      <span className="text-[10px] text-gray-500">
        {total} {total === 1 ? "item" : "itens"}
      </span>
    </button>
  );
}