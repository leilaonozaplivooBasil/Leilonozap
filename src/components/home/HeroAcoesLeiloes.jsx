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

// 🩹 PONTO 87 (19/08/2026) — CAUSA PROVÁVEL do "popup do CompareAQUI aparece
// sozinho" relatado em /leiloes: este botão fica DENTRO da fileira que rola
// no eixo X (arrastar pra ver "Ao Vivo"/"Compartilhar"). Um arrasto rápido é
// facilmente lido pelo navegador como toque — o usuário só queria rolar e
// "sem querer" abre o modal. Guarda simples: só dispara o clique se o dedo
// não se moveu mais que alguns pixels entre o toque e o soltar (gesto de
// toque de verdade, não um arrasto de rolagem).
const LIMITE_ARRASTO_PX = 10;

function useCliqueSemArrasto(onTap) {
  const inicioRef = React.useRef(null);
  return {
    onPointerDown: (e) => { inicioRef.current = { x: e.clientX, y: e.clientY }; },
    onClick: (e) => {
      const inicio = inicioRef.current;
      if (inicio) {
        const dx = Math.abs(e.clientX - inicio.x);
        const dy = Math.abs(e.clientY - inicio.y);
        if (dx > LIMITE_ARRASTO_PX || dy > LIMITE_ARRASTO_PX) return; // foi arrasto, ignora
      }
      onTap(e);
    },
  };
}

export default function HeroAcoesLeiloes({ count = 0 }) {
  const compararTap = useCliqueSemArrasto(() => window.dispatchEvent(new Event("openComparai")));

  return (
    <div className="mt-4 flex items-center gap-4 overflow-x-auto px-3 py-1 nz-no-scrollbar sm:mt-5 sm:gap-6 sm:px-4">
      {/* PONTO 88 — pulso de luz branca da logo do CompareAQUI (local, não vaza pro app) */}
      <style>{`
        .nz-cmp-anel {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          border: 2px solid rgba(255,255,255,0.75);
          pointer-events: none;
          animation: nzCmpAnel 2.2s ease-out infinite;
        }
        @keyframes nzCmpAnel {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        /* O pulso do CompareAQUI cresce PRA DENTRO: a fileira rola no eixo X e
           recortava o halo que saía do círculo, dando impressão de estar atrás. */
        .nz-cmp-anel { animation-name: nzCmpAnelDentro; }
        @keyframes nzCmpAnelDentro {
          0% { transform: scale(0.72); opacity: 0; }
          55% { transform: scale(0.92); opacity: 0.85; }
          100% { transform: scale(1); opacity: 0; }
        }
        .nz-livoo-anel {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          border: 2px solid rgba(217,22,116,0.75);
          pointer-events: none;
          animation: nzCmpAnel 2.2s ease-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .nz-cmp-anel, .nz-livoo-anel { animation: none; }
        }
      `}</style>

      {/* Comparar — mesmo evento global do CompareAQUI */}
      <button
        type="button"
        {...compararTap}
        aria-label="Comparar preços com o CompareAQUI"
        title="CompareAQUI — compare o preço antes de comprar"
        className={acao}
      >
        {/* PONTO 87/88 — SÓ a logo, tamanho da Leila, com anel branco pulsante */}
        <span className="relative block h-12 w-12 shrink-0 sm:h-16 sm:w-16">
          <span className="nz-cmp-anel" aria-hidden="true" />
          <img
            src={CompareAquiIcon}
            alt=""
            aria-hidden="true"
            className="h-full w-full rounded-full object-cover ring-1 ring-white/70"
            style={{ boxShadow: '0 8px 22px rgba(0,0,0,.45)' }}
          />
        </span>
      </button>

      {/* Ao Vivo — mesmo destino do flutuante da Livoo */}
      <a
        href={LIVOO_SITE}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Livoo Live — Compre ao Vivo"
        className={acao}
      >
        {/* PONTO 89 — mesmo padrão do CompareAQUI: só a logo, sem rótulo, com pulso rosa */}
        <span className="relative block h-12 w-12 shrink-0 sm:h-16 sm:w-16">
          <span className="nz-livoo-anel" aria-hidden="true" />
          <span
            className="grid h-full w-full place-items-center rounded-full ring-1 ring-white/60"
            style={{ background: "linear-gradient(135deg, #D91674, #E3559C)", boxShadow: '0 8px 22px rgba(0,0,0,.45)' }}
          >
            <svg viewBox="0 0 48 48" className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden="true">
              <circle cx="24" cy="24" r="19" fill="#ffffff" />
              <path d="M19 15.5 L34 24 L19 32.5 Z" fill="#D91674" stroke="#D91674" strokeWidth="4" strokeLinejoin="round" />
              <circle cx="19" cy="15.5" r="3.4" fill="#D91674" />
            </svg>
          </span>
        </span>
      </a>

      {/* Compartilhar — PONTO 86: só o ícone, sem rótulo (handler intacto) */}
      <ShareLeiloesButton count={count} compact semRotulo />
    </div>
  );
}