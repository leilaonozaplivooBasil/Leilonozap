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
        /* 👆 17/09/2026 — NO CELULAR NÃO EXISTEM SETAS.
           O dono pediu duas vezes: os botões brancos ficaram grandes e tapam a
           arte. No lugar deles, o dedo desliza (onTouchStart/End no
           RotatingBanner). Esta regra é cinto e suspensório: o botão já nasce
           com \`hidden md:block\`, mas este wrapper manda \`!important\` na
           opacidade e, sem o display aqui, uma mudança futura lá poderia
           trazê-los de volta sem ninguém perceber. */
        @media (max-width: 767px) {
          .leiloes-hero-wrapper button[aria-label="Banner anterior"],
          .leiloes-hero-wrapper button[aria-label="Próximo banner"] {
            display: none !important;
          }
        }
        /* 🖥️ No desktop as setas ficam, porque não há dedo para deslizar — mas
           discretas: 8px de folga em vez de 12, fundo menos opaco e sombra mais
           leve. Elas passaram a ficar POR CIMA da arte quando a moldura deixou
           de ter faixa lateral, então o que era "sempre visível e forte" virou
           "sempre visível e discreto". */
        .leiloes-hero-wrapper button[aria-label="Banner anterior"],
        .leiloes-hero-wrapper button[aria-label="Próximo banner"] {
          opacity: 1 !important;
          background-color: rgba(255, 255, 255, 0.72) !important;
          color: #0f172a !important;
          padding: 8px !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18) !important;
          transition: transform 0.2s ease, background-color 0.2s ease !important;
        }
        .leiloes-hero-wrapper button[aria-label="Banner anterior"]:hover,
        .leiloes-hero-wrapper button[aria-label="Próximo banner"]:hover {
          background-color: #ffffff !important;
          transform: translateY(-50%) scale(1.06) !important;
        }
      `}</style>

      {/* 🖼️ 17/09/2026 — A MOLDURA TERMINA ONDE A ARTE TERMINA.
          Medido num Chromium, com a moldura de borda a borda e teto de 520px:

            1354px → arte 924×520, 208px de desfoque de cada lado
            1440px → arte 924×520, 251px de cada lado
            1920px → arte 924×520, 491px de cada lado — 52% da faixa

          A arte nunca esteve cortada; o que sobrava era o `ambient` (desfoque
          da própria arte) preenchendo o que a tela tem A MAIS que 16:9. No
          celular isso nunca apareceu porque a tela é mais ESTREITA que 16:9 —
          é geometria, não configuração.

          Numa tela mais larga que 16:9 dá pra ter a arte completa OU a faixa
          de borda a borda; as duas juntas só com o banner altíssimo (761px a
          1354px, 1080px a 1920px). O dono escolheu a arte completa: a moldura
          passa a ter o tamanho dela, centralizada, com o fundo da página em
          volta em vez de desfoque.

          ⚠️ ISTO NÃO É O BUG DE 15/09. Lá o `aspect-ratio` com `max-height`
          encolhia a largura SEM QUERER e a moldura ficava encostada à
          ESQUERDA, com uma faixa preta à direita. Aqui a largura é limitada de
          propósito e o `mx-auto` centraliza — a diferença entre um acidente e
          uma decisão está no `mx-auto`, e há teste medindo as duas margens.

          924px = 520 × 16/9. Abaixo disso (todo celular e tablet) o `max-w`
          não morde e nada muda: a moldura segue de borda a borda. */}
      <div className="mx-auto w-full max-w-[924px]">
        <RotatingBanner
          banners={banners}
          heightClass="aspect-[16/9]"
          fit="contain"
          rounded={false}
          ambient
        />
      </div>
    </section>
  );
}