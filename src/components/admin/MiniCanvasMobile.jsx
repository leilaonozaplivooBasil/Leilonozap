import React, { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import MiniCanvasMobileGrid from "@/components/admin/MiniCanvasMobileGrid";
import MiniCanvasMobileSection from "@/components/admin/MiniCanvasMobileSection";
import { normaliza } from "@/components/admin/miniCanvasTheme";

/**
 * MiniCanvasMobile — "modo canvas" do celular e tablet.
 * No desktop o mapa cabe todo na tela; aqui a leitura é em dois passos:
 * mapa em blocos por seção → seção aberta em tela cheia. A busca atravessa tudo.
 */
export default function MiniCanvasMobile({ sections, currentPageName, onNavigate }) {
  const [aberta, setAberta] = useState(null);
  const [busca, setBusca] = useState("");

  const termo = normaliza(busca.trim());
  const radical = termo.length >= 4 ? termo.slice(0, 4) : termo;

  const resultados = useMemo(() => {
    if (!termo) return [];
    const achados = [];
    sections.forEach((s) => {
      (s.items || []).forEach((item) => {
        const alvo = normaliza(item.title);
        if (alvo.includes(termo) || alvo.includes(radical)) achados.push({ ...item, secao: s.title });
      });
    });
    return achados;
  }, [termo, radical, sections]);

  const indiceAberta = aberta ? sections.findIndex((s) => s.title === aberta) : -1;

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:hidden">
      {/* Busca */}
      <div className="flex-shrink-0 px-3 pb-2 pt-3">
        <div className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-[#151921] px-3">
          <Search className="h-4 w-4 flex-shrink-0 text-gray-500" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar no painel..."
            className="min-w-0 flex-1 bg-transparent py-2 text-[13px] text-white placeholder:text-gray-500 focus:outline-none"
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              aria-label="Limpar busca"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 active:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        {termo ? (
          resultados.length === 0 ? (
            <p className="px-1 py-8 text-center text-[13px] text-gray-500">
              Nada encontrado para “{busca}”.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {resultados.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={`${item.secao}-${item.pageName}`}
                    onClick={() => onNavigate(item.pageName)}
                    className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#151921] px-3 py-2.5 text-left active:scale-[0.98]"
                  >
                    {ItemIcon && <ItemIcon className="h-4 w-4 flex-shrink-0 text-emerald-300" />}
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-[13px] font-medium leading-tight text-gray-200">
                        {item.title}
                      </span>
                      <span className="block truncate text-[10px] text-gray-500">{item.secao}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )
        ) : indiceAberta >= 0 ? (
          <MiniCanvasMobileSection
            section={sections[indiceAberta]}
            corIndice={indiceAberta}
            currentPageName={currentPageName}
            onVoltar={() => setAberta(null)}
            onNavigate={onNavigate}
          />
        ) : (
          <MiniCanvasMobileGrid
            sections={sections}
            currentPageName={currentPageName}
            onOpen={setAberta}
          />
        )}
      </div>
    </div>
  );
}