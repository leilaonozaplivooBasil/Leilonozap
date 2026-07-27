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

      <RotatingBanner
        banners={banners}
        heightClass="h-[220px] md:h-[340px] lg:h-[460px]"
        fit="cover"
        rounded
      />
    </section>
  );
}