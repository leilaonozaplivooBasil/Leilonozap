import React from 'react';
import RoadmapNo from './RoadmapNo';
import { VIDEOS_OPERACAO } from './videosOperacao';

// 🚀 ROADMAP ASCENDENTE DO CICLO — leitura de baixo (D+0, contrato) para cima
// (D+60, primeiro repasse). O trilho concluído é energizado: uma linha de luz
// dourada sobe continuamente, e o nó da etapa atual pulsa parado onde a operação
// está agora. Nada aqui calcula dinheiro: só apresenta as etapas recebidas.
export default function RoadmapAscendente({ etapas, diaAtual }) {
  // ordem de cima para baixo na tela = do último dia para o primeiro
  const doTopoParaBase = [...etapas].sort((a, b) => b.dia - a.dia);
  const concluidas = etapas.filter((e) => diaAtual >= e.dia).length;
  const preenchido = Math.min(100, Math.max(0, (concluidas / etapas.length) * 100));
  const indiceAtual = etapas.findIndex((e) => diaAtual < e.dia);

  const estadoDe = (etapa) => {
    if (diaAtual >= etapa.dia) return 'concluida';
    const primeiraPendente = indiceAtual >= 0 ? etapas[indiceAtual] : null;
    return primeiraPendente && primeiraPendente.id === etapa.id ? 'atual' : 'futura';
  };

  return (
    <div className="relative mt-8 overflow-hidden border border-pc-borda bg-pc-preto-2 px-4 py-7 sm:px-6">
      {/* textura tech de fundo, bem discreta */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(201,165,92,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(201,165,92,0.6) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <p className="relative mb-6 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-pc-ouro/80">
        Leia de baixo para cima · o ciclo sobe
      </p>

      <div className="relative">
        {/* trilho: base apagada + preenchimento energizado subindo */}
        <span
          aria-hidden="true"
          className="absolute bottom-0 top-0 w-px left-5 md:left-1/2 md:-translate-x-1/2"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, rgba(38,38,43,1) 0 6px, transparent 6px 12px)',
          }}
        />
        <span
          aria-hidden="true"
          className="absolute bottom-0 w-[2px] left-[19px] md:left-1/2 md:-translate-x-1/2 overflow-hidden"
          style={{
            height: `${preenchido}%`,
            background: 'linear-gradient(to top, rgba(201,165,92,0.25), rgba(201,165,92,0.85))',
          }}
        >
          <span className="nz-rm-energia absolute inset-x-0 h-24" />
        </span>

        <ol className="relative">
          {doTopoParaBase.map((etapa, i) => (
            <RoadmapNo
              key={etapa.id}
              etapa={etapa}
              estado={estadoDe(etapa)}
              lado={i % 2 === 0 ? 'dir' : 'esq'}
              data={
                etapa.dataPrevista
                  ? new Date(etapa.dataPrevista).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                    })
                  : null
              }
              video={VIDEOS_OPERACAO[etapa.id]}
            />
          ))}
        </ol>
      </div>

      <style>{`
        @keyframes nzRmSubir {
          0% { transform: translateY(100%); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(-100%); opacity: 0; }
        }
        @keyframes nzRmPulso {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,165,92,0.45); }
          50% { box-shadow: 0 0 0 9px rgba(201,165,92,0); }
        }
        .nz-rm-energia {
          bottom: 0;
          background: linear-gradient(to top, transparent, rgba(228,200,138,0.95), transparent);
          animation: nzRmSubir 2.6s linear infinite;
        }
        .nz-rm-pulso { animation: nzRmPulso 1.8s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .nz-rm-energia { animation: none; opacity: 0.5; }
          .nz-rm-pulso { animation: none; box-shadow: 0 0 0 4px rgba(201,165,92,0.22); }
        }
      `}</style>
    </div>
  );
}