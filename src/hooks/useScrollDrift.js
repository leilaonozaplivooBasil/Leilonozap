import React from 'react';

// 🌊 Drift magnético dos botões flutuantes (pedido do Gabriel 26/07, TODAS as
// páginas e TODOS os tamanhos de tela): página descendo → o botão SOBE
// suavemente da posição base; página subindo → ele DESCE; parou de rolar →
// assenta de volta. O contra-movimento dá a sensação "magnética" de o botão
// boiar sobre o conteúdo em vez de estar pregado na viewport.
//
// Uso: const drift = useScrollDrift(); → aplicar `drift` no className do
// elemento `position: fixed`. O CSS é injetado no <head> uma única vez.

const CSS = `
.scroll-drift { transform: translateZ(0); will-change: transform; transition: transform .5s cubic-bezier(.22,.61,.36,1); }
.scroll-drift--up { transform: translateY(-14px) translateZ(0); }
.scroll-drift--down { transform: translateY(10px) translateZ(0); }
@media (prefers-reduced-motion: reduce) {
  .scroll-drift, .scroll-drift--up, .scroll-drift--down { transition: none; transform: translateZ(0); }
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
