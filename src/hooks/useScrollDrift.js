import React from 'react';

// 🌊 Drift magnético dos botões flutuantes (pedido do Gabriel 26/07, TODAS as
// páginas e TODOS os tamanhos de tela): página descendo → o botão SOBE
// suavemente da posição base; página subindo → ele DESCE; parou de rolar →
// assenta de volta. O contra-movimento dá a sensação "magnética" de o botão
// boiar sobre o conteúdo em vez de estar pregado na viewport.
//
// Uso: const drift = useScrollDrift(); → aplicar `drift` no className do
// elemento `position: fixed`. O CSS é injetado no <head> uma única vez.

// ⚠️ 01/08 — DESLOCAMENTO VERTICAL DESATIVADO. O contra-movimento fazia os
// flutuantes SUBIREM sozinhos durante a rolagem (chegando perto da metade da tela)
// e passarem por cima da barra de lance / de compra. Como a ancoragem agora é
// única (FloatingDock), o drift virou fonte de sobreposição. As classes continuam
// existindo (a API do hook não muda) mas não movem mais nada verticalmente.
const CSS = `
.scroll-drift, .scroll-drift--up, .scroll-drift--down {
  transform: translateZ(0);
  will-change: transform;
}
`;

let injected = false;
function ensureStyles() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const style = document.createElement('style');
  style.setAttribute('data-scroll-drift', '');
  style.textContent = CSS;
  document.head.appendChild(style);
}

export default function useScrollDrift() {
  const [drift, setDrift] = React.useState('rest'); // 'up' | 'down' | 'rest'
  React.useEffect(() => {
    ensureStyles();
    let lastY = window.scrollY;
    let settle = null;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (Math.abs(dy) > 2) setDrift(dy > 0 ? 'up' : 'down');
      clearTimeout(settle);
      settle = setTimeout(() => setDrift('rest'), 260);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(settle); };
  }, []);
  return drift === 'up' ? 'scroll-drift scroll-drift--up' : drift === 'down' ? 'scroll-drift scroll-drift--down' : 'scroll-drift';
}