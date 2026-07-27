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

  // Regra (Gabriel 25/07): assim que o usuário COMEÇA a descer a página, a seta
  // já aparece — sem esperar profundidade, direção ou tempo. Só fica escondida
  // no topo (onde "voltar ao topo" não faz sentido).
  React.useEffect(() => {
    let raf = 0;
    const check = () => setVisible(window.scrollY > 150);
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; check(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    check();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label="Voltar ao topo"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`sm:hidden fixed left-1/2 -translate-x-1/2 z-40 flex items-center justify-center w-10 h-10 rounded-full border border-green-400/30 bg-green-500/15 backdrop-blur-md backdrop-saturate-150 shadow-lg shadow-green-950/50 text-green-100 transition-all duration-150 active:scale-90 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* brilho superior sutil do liquid glass (tom verde da paleta da loja) */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-green-300/15 bg-gradient-to-b from-green-300/20 to-transparent" />
      <ChevronUp className="w-5 h-5 relative" />
    </button>
  );
}
