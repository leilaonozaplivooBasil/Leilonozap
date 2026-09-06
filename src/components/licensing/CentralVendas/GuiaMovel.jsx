import React from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { vibrar, VIBRA_ABRIR } from '@/lib/xgame';

// 📖 GUIA MÓVEL — o texto que ensina, dobrado só no celular.
//
// Ordem do dono (06/09/2026): "no modo celular está com muito texto embaixo
// do Sonho, do Compromisso… tem que ter um guia. Uma página muito limpa,
// muito fluida, mas sem perder nenhuma educação". E, perguntado, fechou:
// "acho que só no celular; e não pode ficar feio".
//
// O QUE ISTO FAZ, e o que NÃO faz:
//   • no DESKTOP não muda nada — devolve o mesmo <div> com as mesmas classes
//     de sempre. Quem já usa no computador não vê diferença nenhuma;
//   • no CELULAR (abaixo do `sm` do Tailwind, 640px) o bloco nasce FECHADO,
//     virando uma linha só — "📖 Como funciona" — que abre o texto inteiro.
//     Nada é cortado nem resumido: é o mesmo texto, a um toque. A primeira
//     AÇÃO do hábito sobe pra primeira dobra, que é o que limpa a tela.
//
// A LINGUAGEM é a mesma do "📖 guia" que cada tarefa já tem no Compromisso —
// a pessoa aprende o gesto uma vez e ele vale pra página inteira.

const CONSULTA_CELULAR = '(max-width: 639px)';

/** true abaixo do `sm`; acompanha o giro da tela / redimensionar. */
export function useEhCelular() {
  const [celular, setCelular] = React.useState(() => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(CONSULTA_CELULAR).matches
      : false
  ));
  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(CONSULTA_CELULAR);
    const ao = (e) => setCelular(e.matches);
    mq.addEventListener?.('change', ao);
    return () => mq.removeEventListener?.('change', ao);
  }, []);
  return celular;
}

export default function GuiaMovel({ titulo = 'Como funciona', className = '', children }) {
  const celular = useEhCelular();
  const [aberto, setAberto] = React.useState(false);

  // desktop: exatamente o que era antes
  if (!celular) return <div className={className}>{children}</div>;

  return (
    <div className={className} data-guia-movel={aberto ? 'aberto' : 'fechado'}>
      <button
        type="button"
        onClick={() => { vibrar(VIBRA_ABRIR); setAberto((v) => !v); }}
        aria-expanded={aberto}
        className="w-full flex items-center gap-2 py-1 text-left"
      >
        <BookOpen className="w-3.5 h-3.5 text-nz-verde shrink-0" />
        <span className="flex-1 text-[11px] font-bold text-nz-tinta">{titulo}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-nz-tinta-fraca transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && <div className="pt-1">{children}</div>}
    </div>
  );
}
