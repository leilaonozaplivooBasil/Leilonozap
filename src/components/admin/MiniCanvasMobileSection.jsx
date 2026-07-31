import React from "react";
import { ArrowLeft } from "lucide-react";
import { corDaSecao } from "@/components/admin/miniCanvasTheme";

/**
 * MiniCanvasMobileSection — seção aberta em tela cheia (segundo nível do mapa).
 * Itens em cartões grandes, com a cor da seção como identidade visual.
 */
export default function MiniCanvasMobileSection({ section, corIndice, currentPageName, onVoltar, onNavigate }) {
  const cor = corDaSecao(corIndice);
  const Icon = section.icon;

  return (
    <div>
      <button
        onClick={onVoltar}
        className="mb-3 flex min-h-[44px] w-full items-center gap-2 rounded-xl px-1 text-left active:bg-white/[0.06]"
      >
        <ArrowLeft className="h-4 w-4 flex-shrink-0 text-gray-400" />
        {Icon && <Icon className={`h-4 w-4 flex-shrink-0 ${cor.texto}`} />}
        <span className={`min-w-0 break-words text-[14px] font-bold ${cor.texto}`}>{section.title}</span>
      </button>

      <div className="grid grid-cols-1 gap-2">
        {(section.items || []).map((item) => {
          const ItemIcon = item.icon;
          const atual = item.pageName === currentPageName;
          return (
            <button
              key={item.pageName}
              onClick={() => onNavigate(item.pageName)}
              className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-transform active:scale-[0.98]"
              style={{
                background: atual ? cor.glow : "rgba(21,25,33,0.9)",
                border: `1px solid ${atual ? cor.ring : "rgba(255,255,255,0.08)"}`,
              }}
            >
              <span
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${cor.ring}` }}
              >
                {ItemIcon && <ItemIcon className={`h-4 w-4 ${cor.texto}`} />}
              </span>
              <span className="min-w-0 flex-1 break-words text-[13px] font-medium leading-tight text-gray-200">
                {item.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}