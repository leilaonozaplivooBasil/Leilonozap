import React from 'react';

// 🧲 DOCK DOS FLUTUANTES — fonte ÚNICA da altura em que os botões flutuantes
// (CompareAQUI, Fale com a Leila, Livoo Live, Voltar ao Topo) se ancoram.
//
// Problema que isto resolve (prints Gabriel 01/08): cada flutuante tinha seu
// próprio `bottom` fixo (24 / 148px / 1.25rem). Nas páginas que têm BARRA DE AÇÃO
// FIXA no rodapé — "COMPRAR AGORA" na loja, botões de lance + campo de lance na
// sala do leilão — essa barra é mais alta que o `bottom` dos flutuantes, então eles
// caíam EM CIMA do que o usuário precisa clicar. Agora todos leem a mesma variável,
// e nas páginas com barra o dock sobe acima dela.
//
// Uso: montar <FloatingDock currentPageName={...} /> uma vez no Layout e aplicar
// nos flutuantes: `nz-dock-bottom` (linha de baixo) ou `nz-dock-bottom-2` (acima).

// Páginas cujo rodapé é uma ÁREA DE AÇÃO presa embaixo da tela (layout de altura
// total): a sala do leilão tem os botões de lance rápido + campo de lance ali.
// Medido em 01/08 no iPhone: o bloco de lance ocupa 140px a partir do fundo, então
// o dock sobe pra 10rem (160px) e sobra folga. As demais páginas rolam normalmente
// e o dock fica rente ao fundo — subir nelas deixaria os botões "soltos" no meio.
const PAGINAS_COM_BARRA_INFERIOR = [
  'AuctionRoom',
  'AuctionDetails',
];

export default function FloatingDock({ currentPageName }) {
  const temBarra = PAGINAS_COM_BARRA_INFERIOR.includes(currentPageName);
  // Base: distância do fundo. Passo: espaço entre um flutuante e o de cima.
  const base = temBarra ? '10rem' : '1.75rem';
  const baseSm = temBarra ? '10.5rem' : '2rem';

  return (
    <style>{`
      :root {
        --nz-dock-b: calc(${base} + env(safe-area-inset-bottom, 0px));
        --nz-dock-step: 4.75rem;
      }
      @media (min-width: 640px) {
        :root {
          --nz-dock-b: calc(${baseSm} + env(safe-area-inset-bottom, 0px));
          --nz-dock-step: 5.75rem;
        }
      }
      .nz-dock-bottom { bottom: var(--nz-dock-b) !important; }
      .nz-dock-bottom-2 { bottom: calc(var(--nz-dock-b) + var(--nz-dock-step)) !important; }
    `}</style>
  );
}