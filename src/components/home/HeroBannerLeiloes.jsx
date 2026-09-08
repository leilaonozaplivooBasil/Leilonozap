import React from "react";
import RotatingBanner from "@/components/banner/RotatingBanner";

/**
 * HeroBannerLeiloes — banner rotativo do topo da página de Leilões.
 *
 * Espelha o MODELO da Loja Virtual (CatalogHero), que já está correto:
 *   1) mesma proporção de altura (220 / 340 / 460px) — acaba com o esticamento
 *      do aspect 16/5, que achatava a arte e o personagem;
 *   2) mesmo encaixe de imagem/vídeo (cover), sem faixas nem distorção;
 *   3) setas de navegação SEMPRE visíveis (o RotatingBanner as esconde até o
 *      hover — aqui o CSS descendente sobrescreve, igual à Loja Virtual);
 *   4) mesmos pontinhos indicadores e mesma rotação automática do carrossel.
 *
 * Diferença única e proposital: aqui o banner é full-bleed (rounded={false}),
 * como já era na página de Leilões.
 */
export default function HeroBannerLeiloes({ banners }) {
  if (!Array.isArray(banners) || banners.length === 0) return null;

  return (
    <section aria-label="Destaques dos Leilões" className="w-full leiloes-hero-wrapper">
      <style>{`
        .leiloes-hero-wrapper button[aria-label="Banner anterior"],
        .leiloes-hero-wrapper button[aria-label="Próximo banner"] {
          opacity: 1 !important;
          background-color: rgba(255, 255, 255, 0.92) !important;
          color: #0f172a !important;
          padding: 12px !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25) !important;
          transition: transform 0.2s ease, background-color 0.2s ease !important;
        }
        .leiloes-hero-wrapper button[aria-label="Banner anterior"]:hover,
        .leiloes-hero-wrapper button[aria-label="Próximo banner"]:hover {
          background-color: #ffffff !important;
          transform: translateY(-50%) scale(1.06) !important;
        }
      `}</style>

      {/* 🖼️ 07/09 — dono: "está cortando no desktop". Container full-bleed com
          altura fixa (220→460px) fica MUITO mais largo que alto (lg: ~4:1) —
          uma foto de gente, ao preencher isso com "cover", sobra só uma tira
          fina da foto original, e o corte 50%/50% (centro) tirava fatia igual
          de cima e de baixo: cortava cabeça pela metade. "top" (testado com
          uma foto sintética nessa mesma proporção extrema) ancora no topo:
          NUNCA corta de cima, só de baixo — a cabeça sempre sobra inteira. */}
      <RotatingBanner
        banners={banners}
        heightClass="h-[220px] md:h-[340px] lg:h-[460px]"
        fit="cover"
        rounded={false}
        objectPosition="top"
      />
    </section>
  );
}