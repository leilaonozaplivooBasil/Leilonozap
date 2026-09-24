import React from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Star } from 'lucide-react';
import { vibrar, VIBRA_TOQUE } from '@/lib/xgame';
import { ORDEM_DAS_VISOES, rotuloDaVisao, numeroDaVisao } from '@/lib/capaDasVisoes';

// ◀ ▶ A BARRA DA VISÃO ABERTA — o que entra no lugar dos 5 quadrados
//     (DIR-183, 24/09/2026)
//
// Dono: "quando eu clicar em Jornada vai sumir os outros, sumir a moeda,
// sumir TUDO e aparecer só o card... e eu posso passar lateralmente com a
// seta ou clicando nos quadrados."
//
// É a irmã de BarraDoHabito.jsx, um nível abaixo, com a mesma gramática:
// voltar pra grade, o anterior, o seguinte, e o "02 / 05" que diz que
// existem cinco e onde se está — agora que as outras quatro não estão mais
// na tela.
//
// 🧭 DIR-182 — ela GRUDA embaixo da barra do app (.nz-faixa-grudada). Dono:
// "que fique fixa no local mais estratégico pra guiar a organização." Dentro
// de uma visão ela é a ÚNICA referência de onde a pessoa está; se rolasse
// junto com o conteúdo, o foco viraria desorientação.
//
// ⭐ A estrela mora aqui, e não na capa, porque ela age sobre A VISÃO ABERTA:
// "o ícone da Top College passa a abrir AQUI".
export default function BarraDaVisao({ visao, aoVoltar, aoAnterior, aoProxima, ehOAtalho = false, aoFixarAtalho = null }) {
  const numero = numeroDaVisao(visao);
  const total = ORDEM_DAS_VISOES.length;

  return (
    <div className="nz-faixa-grudada -mt-1 pt-1 pb-1.5" data-teste="faixa-grudada">
      {/* fundo PRÓPRIO e opaco: grudada, ela tem conteúdo passando por baixo.
          O palco escuro repinta todo bg-white pra vidro de 4,5% (!important),
          então o nome da classe é de propósito um que aquela regra não alcança. */}
      <div
        className="nz-faixa-fundo flex items-center justify-between gap-2 rounded-2xl border border-nz-borda/60 px-2 py-1.5 backdrop-blur-xl"
        data-teste="barra-da-visao"
        style={{ boxShadow: '0 6px 20px -8px rgba(0,0,0,0.25)' }}
      >
        <button
          type="button"
          onClick={() => { vibrar(VIBRA_TOQUE); aoVoltar?.(); }}
          data-teste="voltar-as-visoes"
          title="voltar pra página principal"
          className="inline-flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-all hover:bg-nz-tinta/5"
        >
          <LayoutGrid className="h-4 w-4 shrink-0 text-nz-tinta-fraca" />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-extrabold leading-tight text-nz-tinta">{rotuloDaVisao(visao)}</span>
            <span className="block text-[9px] font-bold uppercase tracking-wide text-nz-tinta-fraca">voltar</span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {aoFixarAtalho && (
            <button
              type="button"
              onClick={() => { if (!ehOAtalho) { vibrar(VIBRA_TOQUE); aoFixarAtalho(visao); } }}
              aria-pressed={ehOAtalho}
              title={ehOAtalho ? 'O ícone da Top College já abre aqui' : 'Fixar esta visão como meu atalho da Top College'}
              data-teste="fixar-atalho"
              className={`rounded-xl p-2 transition-colors ${ehOAtalho ? 'text-amber-500' : 'text-nz-tinta-fraca hover:text-amber-500'}`}
            ><Star className="h-4 w-4" fill={ehOAtalho ? 'currentColor' : 'none'} strokeWidth={2.2} /></button>
          )}
          <button
            type="button"
            onClick={() => { vibrar(VIBRA_TOQUE); aoAnterior?.(); }}
            data-teste="visao-anterior"
            aria-label="visão anterior"
            className="rounded-xl p-2 text-nz-tinta-fraca transition-all hover:bg-nz-tinta/5 hover:text-nz-tinta"
          ><ChevronLeft className="h-4 w-4" /></button>
          {/* o "02 / 05" não é enfeite: é ele que diz que existem cinco e onde
              se está, agora que as outras quatro não estão mais na tela */}
          <span className="px-1 text-[11px] font-bold tabular-nums tracking-[0.18em] text-nz-tinta-fraca/70" data-teste="visao-contador">
            {String(numero).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={() => { vibrar(VIBRA_TOQUE); aoProxima?.(); }}
            data-teste="visao-proxima"
            aria-label="próxima visão"
            className="rounded-xl p-2 text-nz-tinta-fraca transition-all hover:bg-nz-tinta/5 hover:text-nz-tinta"
          ><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}
