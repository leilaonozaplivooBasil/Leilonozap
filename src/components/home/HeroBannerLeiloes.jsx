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

      {/* 🖼️ 15/09/2026 — A MOLDURA PASSA A SEGUIR A ARTE, E NÃO O CONTRÁRIO.
          Antes: altura fixa (220→460px) + "cover" ancorado no topo. Aquilo era o
          melhor possível enquanto a arte não cabia na moldura — nunca cortava
          cabeça (o problema de 07/09), mas cortava TUDO que estivesse embaixo.
          No banner novo do PS5 isso custaria o botão "Ver leilão" e a linha
          "Lances reais · Transparente · Seguro".

          As artes novas são 16:9 (1920×1080) e a ordem do dono foi "viabilizar
          com o tamanho que elas possuem mesmo". Com a moldura em 16:9 e
          `contain`, não existe corte nenhum: a arte aparece inteira, sempre —
          e a ancoragem no topo deixa de ser necessária, porque não há o que
          ancorar quando nada é cortado.

          O teto de 520px é o preço do 16:9 no desktop; sem ele, a 1440px o
          banner teria 810px de altura. É a MESMA receita da Loja Virtual
          (LojaShopeeHeader.jsx), de propósito: um jeito só de mostrar banner.

          ⚠️ A ALTURA VEM DE `56.25vw`, NÃO DE `aspect-[16/9]`. Parecem a mesma
          coisa e não são: `aspect-ratio` com `max-height` encolhe também a
          LARGURA para manter a proporção — a moldura virava 924px encostada à
          esquerda, com o resto da faixa preto. Isto apareceu na foto do preview,
          não no teste, porque o teste media a arte e ela estava certa; quem
          estava errada era a moldura. `56.25vw` é 9/16 da largura da tela: a
          moldura continua de borda a borda e o `ambient` preenche as laterais. */}
      <RotatingBanner
        banners={banners}
        heightClass="h-[56.25vw] max-h-[520px]"
        fit="contain"
        rounded={false}
        ambient
      />
    </section>
  );
}