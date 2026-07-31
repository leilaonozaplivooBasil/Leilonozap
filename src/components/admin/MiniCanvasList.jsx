import React, { useMemo, useState } from "react";
import { Search, ArrowLeft, X } from "lucide-react";
import MiniCanvasSectionCard from "@/components/admin/MiniCanvasSectionCard";

/**
 * MiniCanvasList — Visão Geral no celular e tablet.
 *
 * No canvas do desktop dá pra ver tudo de uma vez; num celular a mesma coisa
 * empilhada vira uma lista quilométrica. Aqui a leitura é em dois passos:
 * primeiro as seções em cartões (visão do todo), depois os links da seção
 * escolhida. A busca atravessa tudo, pra quem já sabe o que quer.
 */
export default function MiniCanvasList({ sections, currentPageName, onNavigate }) {
  const [aberta, setAberta] = useState(null); // título da seção aberta
  const [busca, setBusca] = useState("");

  // Sem acento e sem o "s" do plural: quem digita "cupom" ou "comissao"
  // precisa achar "Cupons" e "Auditoria de Comissões".
  const normaliza = (t) =>
    (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const termo = normaliza(busca.trim());
  // Radical: "cupom" acha "Cupons", "comissao" acha "Comissões".
  const radical = termo.length >= 4 ? termo.slice(0, 4) : termo;

  const resultados = useMemo(() => {
    if (!termo) return [];
    const achados = [];
    sections.forEach((s) => {
      (s.items || []).forEach((item) => {
        const alvo = normaliza(item.title);
        if (alvo.includes(termo) || alvo.includes(radical)) {
          achados.push({ ...item, secao: s.title });
        }
      });
    });
    return achados;
  }, [termo, radical, sections]);

  const secaoAberta = aberta ? sections.find((s) => s.title === aberta) : null;

  const linhaItem = (item, legenda) => {
    const ItemIcon = item.icon;
    const isCurrent = item.pageName === currentPageName;
    return (
      <button
        key={`${legenda || ""}-${item.pageName}`}
        onClick={() => onNavigate(item.pageName)}
        className={`flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
          isCurrent
            ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30"
            : "text-gray-300 active:bg-white/[0.08]"
        }`}
      >
        {ItemIcon && <ItemIcon className="h-4 w-4 flex-shrink-0" />}
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[13px] leading-tight">{item.title}</span>
          {legenda && (
            <span className="block truncate text-[10px] text-gray-500">{legenda}</span>
          )}
        </span>
      </button>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:hidden">
      {/* Busca */}
      <div className="flex-shrink-0 px-3 pb-2 pt-3">
        <div className="flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-[#151921] px-3">
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

      {/* Busca ativa: resultados de todas as seções */}
      {termo ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {resultados.length === 0 ? (
            <p className="px-1 py-6 text-center text-[13px] text-gray-500">
              Nada encontrado para “{busca}”.
            </p>
          ) : (
            <div className="space-y-1">
              {resultados.map((item) => linhaItem(item, item.secao))}
            </div>
          )}
        </div>
      ) : secaoAberta ? (
        /* Segundo nível: links da seção escolhida */
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <button
            onClick={() => setAberta(null)}
            className="mb-2 flex min-h-[44px] w-full items-center gap-2 rounded-xl px-1 text-left text-[13px] font-semibold text-emerald-300 active:bg-white/[0.06]"
          >
            <ArrowLeft className="h-4 w-4 flex-shrink-0" />
            <span className="min-w-0 break-words">{secaoAberta.title}</span>
          </button>
          <div className="space-y-1 rounded-2xl border border-white/10 bg-[#151921] p-2">
            {(secaoAberta.items || []).map((item) => linhaItem(item))}
          </div>
        </div>
      ) : (
        /* Primeiro nível: as seções em cartões */
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            {sections.map((s) => (
              <MiniCanvasSectionCard
                key={s.title}
                section={s}
                isActive={(s.items || []).some((i) => i.pageName === currentPageName)}
                onOpen={() => setAberta(s.title)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}