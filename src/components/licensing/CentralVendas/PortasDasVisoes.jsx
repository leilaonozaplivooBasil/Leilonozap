import React from 'react';
import { Map, ListChecks, LayoutGrid, Network, Inbox } from 'lucide-react';
import { vibrar, VIBRA_TOQUE } from '@/lib/xgame';
import { ORDEM_DAS_VISOES, rotuloDaVisao } from '@/lib/capaDasVisoes';

// 🎴 OS 5 QUADRADOS — a grade da CAPA DO COMPROMISSO (DIR-183, 24/09/2026)
//
// Dono: "eu preciso da mesma função igual os 08 Hábitos do Sucesso... e ter a
// página principal onde aparecem as moedas e etc."
//
// É a irmã de PortasDosHabitos.jsx, um nível abaixo. Mesma gramática de
// propósito: ícone em cima, número, nome, complemento, e o fio da marca que
// acende ao toque. Duas telas que fazem a mesma coisa têm que PARECER a mesma
// coisa — senão a pessoa reaprende o app a cada nível.
//
// O complemento não é enfeite: na capa esta grade é a ÚNICA coisa na tela,
// então cabe dizer o que cada porta É. Sem ele, "Mapa" e "Quadro" são dois
// nomes que ninguém distingue antes de abrir os dois.
const ICONES = { jornada: Map, lista: ListChecks, quadro: LayoutGrid, mapa: Network, demandas: Inbox };
const COMPLEMENTO = {
  jornada: 'o caminho do dia, passo a passo',
  lista: 'o dia inteiro em lista, pra reorganizar',
  quadro: 'o quadro do time, lado a lado',
  mapa: 'o mapa mental das ideias',
  demandas: 'o que chegou e ainda não virou tarefa',
};

export default function PortasDasVisoes({ aoAbrir, demandasEsperando = 0 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3" data-teste="portas-das-visoes">
      {ORDEM_DAS_VISOES.map((id, i) => {
        const Icone = ICONES[id];
        const esperando = id === 'demandas' ? demandasEsperando : 0;
        return (
          <button
            key={id}
            type="button"
            onClick={() => { vibrar(VIBRA_TOQUE); aoAbrir?.(id); }}
            data-teste={`porta-visao-${id}`}
            className="group relative overflow-hidden rounded-xl border border-white/10 hover:border-white/30 px-3.5 py-4 sm:py-5 text-left transition-all hover:bg-white/[0.05]"
          >
            <Icone className="w-[22px] h-[22px] text-white/40 group-hover:text-white/80 transition-colors mb-2.5" />
            <span className="block text-[10px] font-bold tracking-[0.18em] text-white/35 group-hover:text-white/55">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="block text-[13.5px] sm:text-[15px] font-bold leading-tight text-white/85 group-hover:text-white break-words">
              {rotuloDaVisao(id)}
            </span>
            <span className="block text-[11px] leading-snug text-white/35 group-hover:text-white/55 mt-0.5 break-words">
              {COMPLEMENTO[id]}
            </span>

            {/* 🔴 o que está esperando dentro das Demandas — na capa ele PRECISA
                aparecer, porque a capa é a única tela que mostra as cinco */}
            {esperando > 0 && (
              <span
                className="absolute right-2.5 top-2.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-nz-verde-neon px-1.5 text-[10px] font-extrabold leading-[18px] text-nz-tinta"
                data-teste="porta-demandas-contador"
              >{esperando > 99 ? '99+' : esperando}</span>
            )}

            {/* o fio da marca acende de dentro pra fora ao passar o dedo: diz
                "isto abre" sem precisar de mais uma palavra na tela */}
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-[3px] w-0 group-hover:w-full transition-all duration-300"
              style={{ background: 'linear-gradient(90deg, var(--topcollege-azul), var(--topcollege-roxo), var(--topcollege-magenta))' }}
            />
          </button>
        );
      })}
    </div>
  );
}
