import React from "react";
import CompareAquiIcon from "@/assets/compareaqui-icon.webp";
import ShareLeiloesButton from "@/components/home/ShareLeiloesButton";

// 🎯 PONTO 81 — BARRA DE AÇÕES ÚNICA do bloco "Leilões Ativos".
// CompareAQUI e Livoo saem do rodapé/atalho miúdo e ganham NOME + tamanho ao lado
// do Compartilhar, que é onde o cliente decide. Só UI: cada pílula dispara
// exatamente o mesmo comportamento que já existia (evento openComparai, link da
// Livoo e o handler original do ShareLeiloesButton — nada reescrito).
const LIVOO_SITE = "https://livoolive.com.br";

const pill =
  "inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold text-white transition-transform active:scale-[0.97]";

export default function HeroAcoesLeiloes({ count = 0 }) {
  return (
    <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 nz-no-scrollbar">
      {/* Comparar — mesmo evento global do CompareAQUI */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("openComparai"))}
        aria-label="Comparar preços com o CompareAQUI"
        className={pill}
        style={{ background: "rgba(37,99,255,0.16)", border: "1px solid rgba(96,165,250,0.35)" }}
      >
        <img src={CompareAquiIcon} alt="" aria-hidden="true" className="h-6 w-6 rounded-full object-cover" />
        <span>Comparar</span>
      </button>

      {/* Ao Vivo — mesmo destino do flutuante da Livoo */}
      <a
        href={LIVOO_SITE}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Livoo Live — Compre ao Vivo"
        className={pill}
        style={{ background: "rgba(217,22,116,0.16)", border: "1px solid rgba(227,85,156,0.4)" }}
      >
        <span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: "linear-gradient(135deg, #D91674, #E3559C)" }}>
          <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
            <circle cx="24" cy="24" r="19" fill="#ffffff" />
            <path d="M19 15.5 L34 24 L19 32.5 Z" fill="#D91674" stroke="#D91674" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="19" cy="15.5" r="3.4" fill="#D91674" />
          </svg>
        </span>
        <span>Ao Vivo</span>
      </a>

      {/* Compartilhar — componente original, só em formato de pílula */}
      <ShareLeiloesButton count={count} compact />
    </div>
  );
}