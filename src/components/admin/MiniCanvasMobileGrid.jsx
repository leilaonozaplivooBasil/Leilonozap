import React from "react";
import { ChevronRight } from "lucide-react";
import { corDaSecao } from "@/components/admin/miniCanvasTheme";

/**
 * MiniCanvasMobileGrid — o "mapa em blocos" do celular.
 * Cada seção é um bloco com ícone grande, cor própria e contagem de itens.
 */
export default function MiniCanvasMobileGrid({ sections, currentPageName, onOpen }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {sections.map((s, i) => {
        const Icon = s.icon;
        const cor = corDaSecao(i);
        const total = (s.items || []).length;
        const ativa = (s.items || []).some((it) => it.pageName === currentPageName);
        return (
          <button
            key={s.title}
            onClick={() => onOpen(s.title)}
            className="flex min-h-[116px] flex-col items-start gap-2 rounded-2xl p-3 text-left transition-transform active:scale-[0.97]"
            style={{
              background: `linear-gradient(160deg, ${cor.glow}, rgba(21,25,33,0.9))`,
              border: `1px solid ${ativa ? cor.ring : "rgba(255,255,255,0.08)"}`,
              boxShadow: ativa ? `0 0 0 1px ${cor.ring}, 0 8px 24px rgba(0,0,0,0.35)` : "0 6px 18px rgba(0,0,0,0.25)",
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${cor.ring}` }}
            >
              {Icon && <Icon className={`h-5 w-5 ${cor.texto}`} />}
            </div>
            <span className={`min-w-0 break-words text-[13px] font-bold leading-tight ${cor.texto}`}>
              {s.title}
            </span>
            <span className="mt-auto flex w-full items-center justify-between">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cor.chip}`}>
                {total} {total === 1 ? "item" : "itens"}
              </span>
              <ChevronRight className="h-4 w-4 text-gray-500" />
            </span>
          </button>
        );
      })}
    </div>
  );
}