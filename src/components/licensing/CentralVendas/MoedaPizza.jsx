import React from 'react';
import { fatiasDaMoeda, marcasDeLiga, COMPONENTE_INFO } from '@/lib/moedaPizza';
import { LIGAS } from '@/lib/xgame';

// 🪙 A MOEDA EM FATIAS DE PIZZA (DIR-113, 09/09/2026) — dono, ao vivo,
// olhando o placar do Human Token: "produtividade, peso X% na moeda... se
// possível deixar até o desenho da moeda, fatia de pizza, o que cada um está
// pesando... e vai botando a cor de acordo com cada fatia, porque só isso
// aqui é bronze, fez isso fez isso virou prata, até chegar na platina."
//
// 🎨 09/09/2026 — dono, vendo o primeiro desenho: "é uma MOEDA, não é uma
// MEDALHA, entendeu? A gente tem que desenhar uma moeda legal, bonita ali,
// não uma medalha." Correção: um aro dourado (a borda da moeda) por FORA do
// anel de fatias, com a serrilha (as marquinhas do canto de toda moeda de
// verdade) e um rosto com verniz — as fatias continuam sendo a GRAVAÇÃO no
// rosto da moeda, não o contorno dela. As marcas de liga viram entalhes na
// borda dourada (mais grossos que a serrilha comum), não linhas soltas
// cruzando as cores.
//
// Um anel (donut) de 0 até TOKEN_MAX: cada fatia colorida é um componente do
// Human Token (`ciclo.componentes`, xgame.js) — nunca recalculado aqui, só
// desenhado (a conta pura mora em src/lib/moedaPizza.js). O que falta pra
// fechar o teto fica cinza.
export default function MoedaPizza({ componentes = {}, total = 0, max, liga = null }) {
  const { fatias, restante } = fatiasDaMoeda(componentes, max, total);
  const marcas = marcasDeLiga(LIGAS, max);

  // 🥇 a anatomia da moeda: de dentro pra fora —
  //   ROSTO (verniz) → FATIAS (a gravação) → BORDA dourada → SERRILHA (o canto)
  const R = 62;                                    // raio do anel das fatias
  const ESPESSURA = 20;                             // espessura do anel das fatias
  const R_ROSTO = R - ESPESSURA / 2 - 4;             // o disco central, sob o número
  const R_BORDA = R + ESPESSURA / 2 + 8;             // o aro dourado da moeda
  const ESPESSURA_BORDA = 7;
  const R_SERRILHA_INI = R_BORDA + ESPESSURA_BORDA / 2 + 2;
  const R_SERRILHA_FIM = R_SERRILHA_INI + 6;
  const R_ROTULO_LIGA = R_SERRILHA_FIM + 13;
  const PAD = 15;
  const svgSize = R_ROTULO_LIGA * 2 + PAD * 2;
  const c = svgSize / 2;
  const circunferencia = 2 * Math.PI * R;
  const uid = React.useId();

  // 🕐 o anel começa no topo (12h) e vai em sentido horário — mesma
  // convenção de qualquer "progresso circular" que a pessoa já reconhece.
  const anguloDe = (posicao) => posicao * 360 - 90;
  const pontoNoAngulo = (graus, raio) => {
    const rad = (graus * Math.PI) / 180;
    return [c + raio * Math.cos(rad), c + raio * Math.sin(rad)];
  };
  // a serrilha: as marquinhas do canto de toda moeda de verdade — decorativa,
  // não carrega dado nenhum (por isso não mora em moedaPizza.js).
  const N_SERRILHA = 44;
  const serrilha = Array.from({ length: N_SERRILHA }, (_, i) => anguloDe(i / N_SERRILHA));

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg viewBox={`0 0 ${svgSize} ${svgSize}`} width={svgSize} height={svgSize} className="shrink-0" role="img" aria-label="A moeda do Human Token, dividida por componente">
        <defs>
          <linearGradient id={`${uid}-borda`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F4D976" />
            <stop offset="45%" stopColor="#C99A2E" />
            <stop offset="100%" stopColor="#8A6413" />
          </linearGradient>
          <radialGradient id={`${uid}-rosto`} cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#FFFBEF" />
            <stop offset="100%" stopColor="#F1E3BE" />
          </radialGradient>
        </defs>

        {/* a SERRILHA — o canto ondulado de toda moeda de verdade */}
        {serrilha.map((graus, i) => {
          const [x1, y1] = pontoNoAngulo(graus, R_SERRILHA_INI);
          const [x2, y2] = pontoNoAngulo(graus, R_SERRILHA_FIM);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#B8933A" strokeWidth={2} strokeLinecap="round" />;
        })}

        {/* a BORDA dourada da moeda */}
        <circle cx={c} cy={c} r={R_BORDA} fill="none" stroke={`url(#${uid}-borda)`} strokeWidth={ESPESSURA_BORDA} />
        <circle cx={c} cy={c} r={R_BORDA} fill="none" stroke="#00000022" strokeWidth={1} />

        {/* o ROSTO da moeda — o disco sob a gravação */}
        <circle cx={c} cy={c} r={R + ESPESSURA / 2 + 2} fill={`url(#${uid}-rosto)`} />

        {/* trilho de base — o que ainda não foi conquistado */}
        <circle cx={c} cy={c} r={R} fill="none" stroke="#E3E6EE" strokeWidth={ESPESSURA} />
        {/* as fatias — a GRAVAÇÃO da moeda, uma por cima da outra, cada uma
            começando onde a anterior terminou */}
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

        {/* o ROSTO central — o número entalhado, como o valor de face da moeda */}
        <circle cx={c} cy={c} r={R_ROSTO} fill={`url(#${uid}-rosto)`} stroke="#D4AF37" strokeWidth={1.5} />
        <text x={c} y={c - 6} textAnchor="middle" fontSize="19" fontWeight="800" fill="#1A1A1A">{total.toFixed(2)}</text>
        <text x={c} y={c + 13} textAnchor="middle" fontSize="10" fontWeight="700" fill="#5C6B62">{liga ? `${liga.emoji} ${liga.label}` : `de ${max}`}</text>

        {/* as marcas de liga — entalhes na BORDA (mais grossos que a
            serrilha comum) onde bronze vira prata, prata vira ouro, ouro
            vira platina */}
        {marcas.map((m) => {
          const graus = anguloDe(m.posicao);
          const [x1, y1] = pontoNoAngulo(graus, R_BORDA - ESPESSURA_BORDA / 2 - 2);
          const [x2, y2] = pontoNoAngulo(graus, R_SERRILHA_FIM + 2);
          const [lx, ly] = pontoNoAngulo(graus, R_ROTULO_LIGA);
          return (
            <g key={m.id}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1A1A1A" strokeWidth={2} strokeLinecap="round" />
              <text x={lx} y={ly} fontSize="12" textAnchor="middle" dominantBaseline="middle">{m.emoji}</text>
            </g>
          );
        })}
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
