import React from 'react';
import { ChevronUp } from 'lucide-react';

// 📱 Botão "voltar ao topo" GLOBAL do mobile (pedido do Gabriel 25/07):
// quando o usuário já desceu bastante em QUALQUER página, aparece um botão em
// liquid glass, discreto, centralizado embaixo — um toque e volta ao topo de uma vez.
// Regras pra NÃO interferir na usabilidade:
//  - só existe no mobile (sm:hidden) — desktop permanece intocado;
//  - só aparece depois de ~1,5 tela de rolagem E quando o usuário rola pra CIMA
//    (intenção de voltar) ou chega perto do fim da página;
//  - fica no centro inferior (não cobre CompareAQUI à esquerda nem a Leila à direita)
//    e abaixo deles no z-index;
//  - respeita a safe-area do iPhone/PWA.
export default function BackToTopButton() {
  const [visible, setVisible] = React.useState(false);
  const lastY = React.useRef(0);
  const deepSince = React.useRef(null); // desde quando o usuário está "fundo" na página

  React.useEffect(() => {
    let raf = 0;
    const check = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      const doc = document.documentElement.scrollHeight;
      const scrollingUp = y < lastY.current - 4;
      const nearBottom = y + vh >= doc - vh * 0.5;
      const deepEnough = y > vh * 1.5;
      // ⏱️ "navegou por muito tempo": fundo na página há 3s+ também mostra a seta
      if (deepEnough && deepSince.current === null) deepSince.current = Date.now();
      if (!deepEnough) deepSince.current = null;
      const dwellingDeep = deepSince.current !== null && Date.now() - deepSince.current > 3000;
      setVisible(deepEnough && (scrollingUp || nearBottom || dwellingDeep));
      lastY.current = y;
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; check(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const dwellTimer = setInterval(check, 1000); // pega o caso "parado lendo" sem novo scroll
    check();
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearInterval(dwellTimer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label="Voltar ao topo"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`sm:hidden fixed left-1/2 -translate-x-1/2 z-40 flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-white/10 backdrop-blur-md backdrop-saturate-150 shadow-lg shadow-black/40 text-white transition-all duration-300 active:scale-90 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* brilho superior sutil do liquid glass */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/10 bg-gradient-to-b from-white/15 to-transparent" />
      <ChevronUp className="w-5 h-5 relative" />
    </button>
  );
}
