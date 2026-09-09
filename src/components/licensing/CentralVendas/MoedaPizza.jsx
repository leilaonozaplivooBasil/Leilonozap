import React from 'react';
import { fatiasDaMoeda, marcasDeLiga, COMPONENTE_INFO } from '@/lib/moedaPizza';
import { LIGAS } from '@/lib/xgame';

// 🪙 A MOEDA EM FATIAS DE PIZZA (DIR-113, 09/09/2026) — dono, ao vivo,
// olhando o placar do Human Token: "produtividade, peso X% na moeda... se
// possível deixar até o desenho da moeda, fatia de pizza, o que cada um está
// pesando... e vai botando a cor de acordo com cada fatia, porque só isso
// aqui é bronze, fez isso fez isso virou prata, até chegar no diamante."
//
// Um anel (donut) de 0 até TOKEN_MAX: cada fatia colorida é um componente do
// Human Token (`ciclo.componentes`, xgame.js) — nunca recalculado aqui, só
// desenhado (a conta pura mora em src/lib/moedaPizza.js). O que falta pra
// fechar o teto fica cinza. Os traços por cima do anel marcam onde
// bronze/prata/ouro/diamante cortam — a mesma régua de LIGAS que já decide a
// liga da pessoa em outro lugar da tela.
export default function MoedaPizza({ componentes = {}, total = 0, max, liga = null }) {
  const { fatias, restante } = fatiasDaMoeda(componentes, max);
  const marcas = marcasDeLiga(LIGAS, max);

  const R = 70;
  const ESPESSURA = 22;
  const PAD = 26;
  const svgSize = R * 2 + PAD * 2;
  const c = svgSize / 2;
  const circunferencia = 2 * Math.PI * R;

  // 🕐 o anel começa no topo (12h) e vai em sentido horário — mesma
  // convenção de qualquer "progresso circular" que a pessoa já reconhece.
  const anguloDe = (posicao) => posicao * 360 - 90;
  const pontoNoAngulo = (graus, raio) => {
    const rad = (graus * Math.PI) / 180;
    return [c + raio * Math.cos(rad), c + raio * Math.sin(rad)];
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg viewBox={`0 0 ${svgSize} ${svgSize}`} width={svgSize} height={svgSize} className="shrink-0" role="img" aria-label="A moeda do Human Token, dividida por componente">
        {/* trilho de base — o que ainda não foi conquistado */}
        <circle cx={c} cy={c} r={R} fill="none" stroke="#E3E6EE" strokeWidth={ESPESSURA} />
        {/* as fatias, uma por cima da outra, cada uma começando onde a anterior terminou */}
        {fatias.filter((f) => f.valor > 0).map((f) => {
          const info = COMPONENTE_INFO[f.k];
          const comprimento = (f.valor / max) * circunferencia;
          const offsetInicio = (f.inicio / max) * circunferencia;
          return (
            <circle
              key={f.k}
              cx={c} cy={c} r={R} fill="none"
              stroke={info.cor} strokeWidth={ESPESSURA}
              strokeDasharray={`${comprimento} ${circunferencia - comprimento}`}
              strokeDashoffset={-offsetInicio}
              transform={`rotate(-90 ${c} ${c})`}
              strokeLinecap="butt"
            />
          );
        })}
        {/* as marcas de liga — onde bronze vira prata, prata vira ouro, ouro vira diamante */}
        {marcas.map((m) => {
          const graus = anguloDe(m.posicao);
          const [x1, y1] = pontoNoAngulo(graus, R - ESPESSURA / 2 - 3);
          const [x2, y2] = pontoNoAngulo(graus, R + ESPESSURA / 2 + 3);
          const [lx, ly] = pontoNoAngulo(graus, R + ESPESSURA / 2 + 14);
          return (
            <g key={m.id}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1A1A1A" strokeWidth={1.5} />
              <text x={lx} y={ly} fontSize="12" textAnchor="middle" dominantBaseline="middle">{m.emoji}</text>
            </g>
          );
        })}
        {/* o centro: total + liga atual */}
        <text x={c} y={c - 6} textAnchor="middle" fontSize="19" fontWeight="800" fill="#1A1A1A">{total.toFixed(2)}</text>
        <text x={c} y={c + 13} textAnchor="middle" fontSize="10" fontWeight="700" fill="#5C6B62">{liga ? `${liga.emoji} ${liga.label}` : `de ${max}`}</text>
      </svg>

      <div className="flex-1 w-full space-y-1.5">
        {fatias.map((f) => {
          const info = COMPONENTE_INFO[f.k];
          const pctDaMoeda = max > 0 ? Math.round((f.valor / max) * 1000) / 10 : 0;
          return (
            <div key={f.k} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-nz-tinta font-medium">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: info.cor }} />
                {info.emoji} {info.rotulo}
              </span>
              <span className="tabular-nums text-nz-tinta-fraca shrink-0">
                <strong className="text-nz-tinta">{f.valor.toFixed(2)}</strong> pts · peso {pctDaMoeda}% da moeda
              </span>
            </div>
          );
        })}
        {restante > 0 && (
          <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-nz-borda/40">
            <span className="flex items-center gap-1.5 text-nz-tinta-fraca">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#E3E6EE]" /> ainda não conquistado
            </span>
            <span className="tabular-nums text-nz-tinta-fraca">{restante.toFixed(2)} pts</span>
          </div>
        )}
      </div>
    </div>
  );
}
