import React from "react";
import CompareAquiIcon from "@/assets/compareaqui-icon.webp";
import ShareLeiloesButton from "@/components/home/ShareLeiloesButton";

// 🎯 PONTO 83 — AÇÕES SEM FUNDO, EM TINTA CLARA: só a bolinha (logo, nas cores
// originais) + o nome, sobre o bloco escuro do "Leilões Ativos". Sem cápsula nem
// borda, as três ações cabem lado a lado sem corte e o ambiente fica mais leve.
// ⚠️ Comportamento idêntico ao PONTO 81 — nada de lógica reescrita.
const LIVOO_SITE = "https://livoolive.com.br";

// Aperto calibrado pra as TRÊS ações caberem inteiras em 375px (e em 320px, com rolagem)
const acao =
  "inline-flex min-h-[44px] shrink-0 items-center gap-1.5 text-[13px] font-semibold text-gray-100 transition-transform active:scale-[0.97] sm:gap-2 sm:text-sm";

export default function HeroAcoesLeiloes({ count = 0 }) {
  return (
    <div className="mt-3 flex items-center gap-3 overflow-x-auto nz-no-scrollbar sm:gap-5">
      {/* Comparar — mesmo evento global do CompareAQUI */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("openComparai"))}
        aria-label="Comparar preços com o CompareAQUI"
        title="CompareAQUI — compare o preço antes de comprar"
        className={acao}
      >
        {/* PONTO 87 — SÓ a logo, no tamanho do flutuante da Leila (sem rótulo) */}
        <img
          src={CompareAquiIcon}
          alt=""
          aria-hidden="true"
          className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-white/70 sm:h-16 sm:w-16"
          style={{ boxShadow: '0 8px 22px rgba(0,0,0,.45)' }}
        />
      </button>

      {/* Ao Vivo — mesmo destino do flutuante da Livoo */}
      <a
        href={LIVOO_SITE}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Livoo Live — Compre ao Vivo"
        className={acao}
      >
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full sm:h-7 sm:w-7"
          style={{ background: "linear-gradient(135deg, #D91674, #E3559C)" }}
        >
          <svg viewBox="0 0 48 48" className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true">
            <circle cx="24" cy="24" r="19" fill="#ffffff" />
            <path d="M19 15.5 L34 24 L19 32.5 Z" fill="#D91674" stroke="#D91674" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="19" cy="15.5" r="3.4" fill="#D91674" />
          </svg>
        </span>
        <span>Ao Vivo</span>
      </a>

      {/* Compartilhar — PONTO 86: só o ícone, sem rótulo (handler intacto) */}
      <ShareLeiloesButton count={count} compact semRotulo />
    </div>
  );
}