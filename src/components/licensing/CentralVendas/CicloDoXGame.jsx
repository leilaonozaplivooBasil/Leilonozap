import React from 'react';
import { CICLO_DO_XGAME } from '@/lib/cicloDoXGame';

// 🔄 O DESENHO DO CICLO — o que a capa dos 8 Hábitos ensina
//
// Dono (24/09/2026): "uma explicação, em uma página da gamificação. Um
// desenho, pode ser — vou dar liberdade de ação para você. Mas eu quero algo
// tudo muito limpo e muito fluido, porque eu estou sentindo muita informação."
//
// 🔴 POR QUE NÃO É UM FLUXOGRAMA COM SETAS E CAIXAS: num celular, um diagrama
// de seis nós ou vira miniatura ilegível, ou vira rolagem horizontal. Os dois
// são o contrário de "limpo". Aqui o desenho é a PRÓPRIA LISTA: um trilho
// vertical que liga os seis passos, com o número em cima do trilho. No
// computador ele abre em duas colunas; no celular desce em coluna única, sem
// nada encolher. É o mesmo desenho, não uma versão pobre.
//
// 🔁 O SEXTO PASSO FECHA O CÍRCULO, e o trilho mostra isso: o último ponto é o
// único com aro completo e o rótulo "volta ao 01". Era essa a coisa que a tela
// antiga nunca dizia — as pessoas viam oito portas soltas e o X-Game como um
// placar à parte.
export default function CicloDoXGame() {
  return (
    <section data-teste="ciclo-do-xgame" className="relative">
      <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.28em] text-white/45 uppercase mb-2">
        Como a gamificação funciona
      </p>
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight mb-1">
        Um círculo, não oito tarefas soltas
      </h2>
      <p className="text-sm text-white/55 mb-6 max-w-xl">
        Os 8 Hábitos não são uma lista de afazeres: são as engrenagens de um ciclo que
        começa no seu sonho e volta pra ele.
      </p>

      <ol className="relative grid gap-5 sm:grid-cols-2 sm:gap-x-8">
        {/* o trilho: uma linha só, atrás dos números. No celular ele corre a
            coluna inteira; a partir de `sm` some, porque em duas colunas uma
            linha vertical ligaria passos que não são vizinhos — mentiria. */}
        <span
          aria-hidden="true"
          className="absolute left-[15px] top-2 bottom-2 w-px sm:hidden"
          style={{ background: 'linear-gradient(180deg, var(--topcollege-azul), var(--topcollege-roxo) 55%, var(--topcollege-magenta))' }}
        />
        {CICLO_DO_XGAME.map((p, i) => {
          const ultimo = i === CICLO_DO_XGAME.length - 1;
          return (
            <li key={p.id} className="relative flex gap-3.5">
              <span
                className={`relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold ${
                  ultimo ? 'text-white' : 'text-white/85'
                }`}
                style={ultimo
                  ? { background: 'linear-gradient(120deg, var(--topcollege-azul), var(--topcollege-roxo) 55%, var(--topcollege-magenta))' }
                  : { background: 'rgba(255,255,255,.07)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16)' }}
              >
                {p.n}
              </span>
              <div className="min-w-0 pb-1">
                <p className="text-[15px] font-bold text-white leading-snug">{p.titulo}</p>
                <p className="text-[13px] text-white/60 leading-relaxed mt-1">{p.texto}</p>
                <p className="text-[11px] text-white/35 mt-1.5">{p.ondeMora}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
