import React from "react";
import RotatingBanner from "@/components/banner/RotatingBanner";

/**
 * CatalogHero — wrapper panorâmico do banner rotativo (o HERÓI da Loja).
 *
 * Faz DUAS coisas via wrapper, sem tocar no RotatingBanner:
 *   1) Aumenta a altura (460/340/220px)
 *   2) Força as setas de navegação a serem SEMPRE visíveis
 *      (o RotatingBanner tem opacity-0 group-hover:opacity-100 nos botões;
 *       aqui aplicamos CSS descendente com !important pra sobrescrever)
 */
export default function CatalogHero({ banners }) {
  if (!Array.isArray(banners) || banners.length === 0) return null;

  return (
    <section aria-label="Destaques da Loja" className="w-full catalog-hero-wrapper">
      <style>{`
        .catalog-hero-wrapper button[aria-label="Banner anterior"],
        .catalog-hero-wrapper button[aria-label="Próximo banner"] {
          opacity: 1 !important;
          background-color: rgba(255, 255, 255, 0.92) !important;
          color: #0f172a !important;
          padding: 12px !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25) !important;
          transition: transform 0.2s ease, background-color 0.2s ease !important;
        }
        .catalog-hero-wrapper button[aria-label="Banner anterior"]:hover,
        .catalog-hero-wrapper button[aria-label="Próximo banner"]:hover {
          background-color: #ffffff !important;
          transform: translateY(-50%) scale(1.06) !important;
        }
        .catalog-hero-wrapper button[aria-label^="Ir para banner"] {
          width: 10px !important;
          height: 10px !important;
        }
      `}</style>

      {/* 🖼️ 16/09/2026 — ERA O ÚNICO LUGAR QUE CORTAVA DE VERDADE.
          Altura fixa + `cover` recorta a arte para preencher a moldura: numa
          faixa de 460px de altura e ~1300 de largura, uma arte 16:9 perde as
          bordas. Agora é a mesma receita da Home: moldura 16:9 de borda a borda
          (`56.25vw` = 9/16 da largura da tela), `contain` para não cortar nada e
          teto de 520px para o desktop não virar banner de tela inteira.
          ⚠️ `56.25vw`, NÃO `aspect-[16/9]`: com `max-height` junto, o
          `aspect-ratio` encolhe a LARGURA também e a moldura descola das bordas. */}
      <RotatingBanner
        banners={banners}
        heightClass="h-[56.25vw] max-h-[520px]"
        fit="contain"
        ambient
        rounded
      />
    </section>
  );
}