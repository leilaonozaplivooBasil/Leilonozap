import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ↔️ 02/09/2026 — FILEIRA QUE ROLA DE VERDADE.
//
// A fileira de categorias da Loja Virtual não rolava para o lado. O motivo não era
// de CSS: existia um bloco de 45 linhas em Catalog.jsx que implementava arrastar com
// o mouse, lendo `scrollerRef.current` — e o `ref` NUNCA foi preso a elemento nenhum
// (aparecia só na declaração e na leitura). O efeito saía na primeira linha, toda vez.
// Era código morto com aparência de funcionalidade.
//
// Havia ainda um segundo defeito por baixo do primeiro: o efeito tinha dependências
// `[]`, então rodava na montagem — quando `categories` ainda está vazio e a fileira
// sequer existe no DOM (ela é condicional a `categories.length > 0`). Mesmo com o ref
// preso, não teria funcionado.
//
// Três formas de rolar, porque cada uma serve a um público:
//   · setas    — desktop com mouse, o único caso que não tinha saída nenhuma
//   · arrastar — desktop, para quem prefere o gesto
//   · deslizar — celular, que já funcionava pelo scroll nativo e continua intacto
//
// As setas só aparecem quando há o que rolar, e cada uma some ao chegar na ponta.
// Seta que não leva a lugar nenhum é ruído.

const LIMITE_ARRASTO_PX = 6;

export default function RolagemHorizontal({ children, className = '', rotulo = 'Rolar' }) {
  const ref = React.useRef(null);
  const [podeEsq, setPodeEsq] = React.useState(false);
  const [podeDir, setPodeDir] = React.useState(false);

  const medir = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const folga = el.scrollWidth - el.clientWidth;
    // 1px de tolerância: arredondamento de layout deixava a seta acesa no fim.
    setPodeEsq(el.scrollLeft > 1);
    setPodeDir(folga > 1 && el.scrollLeft < folga - 1);
  }, []);

  // ResizeObserver em vez de medir só na montagem: as categorias chegam por rede
  // DEPOIS da primeira renderização, e a fileira muda de largura quando chegam.
  // Foi exatamente esse descompasso que deixou a versão anterior sem efeito.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    for (const filho of el.children) ro.observe(filho);
    el.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir);
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', medir);
      window.removeEventListener('resize', medir);
    };
  }, [medir, children]);

  const rolar = (direcao) => {
    const el = ref.current;
    if (!el) return;
    // Suavidade só AQUI, na chamada — nunca no CSS: `scroll-behavior: smooth` no
    // elemento faria cada scrollLeft do arrasto virar animação, e arrastar deixava
    // de acompanhar o ponteiro.
    const semAnimacao = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    // 80% da largura visível: sobra uma âncora do que a pessoa estava vendo.
    el.scrollBy({ left: direcao * el.clientWidth * 0.8, behavior: semAnimacao ? 'auto' : 'smooth' });
  };

  // Arrastar com o mouse. Só para mouse: no toque o scroll nativo já funciona, e
  // sequestrar o gesto costuma quebrar o embalo natural do celular.
  const arrasto = React.useRef({ ativo: false, x0: 0, scroll0: 0, andou: 0 });

  const aoDescer = (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = ref.current;
    arrasto.current = { ativo: true, x0: e.clientX, scroll0: el.scrollLeft, andou: 0 };
  };

  const aoMover = (e) => {
    const a = arrasto.current;
    if (!a.ativo) return;
    const dx = e.clientX - a.x0;
    a.andou = Math.max(a.andou, Math.abs(dx));
    if (a.andou > LIMITE_ARRASTO_PX) e.preventDefault();
    ref.current.scrollLeft = a.scroll0 - dx;
  };

  const aoSoltar = () => { arrasto.current.ativo = false; };

  // Um arrasto que termina em cima de um botão NÃO pode contar como clique — senão
  // rolar a fileira troca a categoria sem querer. Mesmo cuidado que o
  // HeroAcoesLeiloes já toma na Home (PONTO 87), aqui na fase de captura.
  const aoClicarCapturando = (e) => {
    if (arrasto.current.andou > LIMITE_ARRASTO_PX) {
      e.preventDefault();
      e.stopPropagation();
      arrasto.current.andou = 0;
    }
  };

  const seta = 'absolute top-1/2 -translate-y-1/2 z-10 hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-900/95 text-gray-300 shadow-lg transition-colors hover:text-white hover:border-gray-500';

  return (
    <div className="relative min-w-0 flex-1">
      {podeEsq && (
        <button type="button" onClick={() => rolar(-1)} aria-label={`${rotulo} para a esquerda`} className={`${seta} left-0`}>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
      )}

      <div
        ref={ref}
        onPointerDown={aoDescer}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerLeave={aoSoltar}
        onPointerCancel={aoSoltar}
        onClickCapture={aoClicarCapturando}
        className={`nz-rolagem-h overflow-x-auto ${className}`}
      >
        {children}
      </div>

      {podeDir && (
        <button type="button" onClick={() => rolar(1)} aria-label={`${rotulo} para a direita`} className={`${seta} right-0`}>
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
