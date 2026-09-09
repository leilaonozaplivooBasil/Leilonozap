import React from 'react';
import { pontosDaRoda, pontoDoEixo, redondezDaRoda, faixaDaRoda } from '@/lib/rodaDaVida';

// 🎡 A RODA DA VIDA (DIR-109, 09/09/2026 → DIR-112, redesenho): dono, sobre a
// primeira versão (um pentágono de 5 lados retos): "quando eu falei a roda,
// ele faz, o painel dele virar uma roda de acordo, pra ele tem que ser
// quase dez em tudo, pra transformar numa roda... Está aparecendo qualquer
// outra coisa menos uma roda."
//
// A causa: um pentágono NUNCA vira círculo, por melhor que seja a nota — a
// forma de base é poligonal. Aqui o alvo já é desenhado como um CÍRCULO de
// verdade (raio fixo — os 5 eixos já chegam normalizados a 100% do próprio
// alvo, então "bater a meta" É o círculo), e o desempenho real é uma curva
// suave (não reta) entre os 5 eixos: perto de 100% em tudo, a curva
// praticamente encosta no círculo — a roda fecha. Um eixo fraco "amassa" a
// curva pra dentro só daquele lado — o pneu murcho, visível na hora. A
// matemática da curva mora em `src/lib/rodaDaVida.js`, compartilhada com o
// mesmo desenho no PDF Executivo (PdfExecutivo.jsx) — a roda da tela e a do
// PDF são a mesma conta.
//
// `eixos`: [{ k, rotuloCurto, emoji, atual (0-100), alvo (0-100) }], na
// mesma ordem que a lista de barras já usa.
export default function RadarEixos({ eixos = [], dialeto = 'claro', raio = 78 }) {
  const escuro = dialeto === 'escuro';
  const COR = escuro
    ? { grade: 'rgba(255,255,255,0.12)', alvo: '#fbbf24', atual: '#34d399', rotulo: '#C1BECA', fraco: '#f87171' }
    : { grade: '#E3E6EE', alvo: '#D97706', atual: 'var(--nz-verde)', rotulo: '#5B5B66', fraco: '#DC2626' };

  const n = eixos.length;
  if (n < 3) return null; // roda não faz sentido com menos de 3 eixos

  // 🐛 09/09/2026 — a primeira versão clipava "Produção"/"Real Time" nas
  // pontas: o texto do rótulo estica bem além do raio da roda, e o <svg>
  // corta tudo que passa do viewBox por padrão. A folga (PAD) reserva
  // espaço de sobra pro texto mais comprido, nas quatro direções.
  const PAD_X = 108;
  const PAD_Y = 40;
  const R = raio;
  const svgW = R * 2 + PAD_X * 2;
  const svgH = R * 2 + PAD_Y * 2;
  const cx = svgW / 2;
  const cy = svgH / 2;
  const px = ([x, y]) => [cx + x * R, cy + y * R];

  const angulo = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pontoLabel = (i) => {
    const a = angulo(i);
    return [cx + (R + 14) * Math.cos(a), cy + (R + 14) * Math.sin(a)];
  };
  const ANEIS = [25, 50, 75];
  const curva = pontosDaRoda(eixos).map(px);
  const dCurva = curva.length ? `M ${curva.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ')} Z` : '';
  const redondez = redondezDaRoda(eixos);
  const faixa = faixaDaRoda(redondez);
  // 🌀 quanto mais redonda (e mais cheia), mais perto de virar uma roda de
  // verdade — a régua do dono era exatamente essa: "quase dez em tudo, pra
  // transformar numa roda... pra a vida andar." Ela GIRA (anima) só quando
  // já fechou de verdade; `prefers-reduced-motion` desliga a animação.
  const gira = redondez >= 0.85;

  return (
    <div style={{ maxWidth: svgW, margin: '0 auto' }}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height="auto" style={{ display: 'block', margin: '0 auto', overflow: 'visible' }} role="img" aria-label="A roda da vida do Executivo Ideal">
        <style>{`
          @media (prefers-reduced-motion: no-preference) {
            .nz-roda-gira { transform-box: fill-box; transform-origin: center; animation: nz-girar 6s linear infinite; }
          }
          @keyframes nz-girar { to { transform: rotate(360deg); } }
        `}</style>
        {/* anéis de referência, discretos */}
        {ANEIS.map((p) => (
          <circle key={p} cx={cx} cy={cy} r={(p / 100) * R} fill="none" stroke={COR.grade} strokeWidth={1} />
        ))}
        {eixos.map((e, i) => {
          const a = angulo(i);
          return <line key={e.k} x1={cx} y1={cy} x2={cx + R * Math.cos(a)} y2={cy + R * Math.sin(a)} stroke={COR.grade} strokeWidth={1} />;
        })}
        {/* o ALVO já é o círculo — bater a meta em tudo É virar uma roda */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={COR.alvo} strokeWidth={1.5} strokeDasharray="4 3" />
        {/* a roda de verdade — a curva suave por cima do desempenho real */}
        {dCurva && (
          <path d={dCurva} fill={COR.atual} fillOpacity={0.24} stroke={COR.atual} strokeWidth={2.25} strokeLinejoin="round" className={gira ? 'nz-roda-gira' : ''} />
        )}
        {eixos.map((e, i) => {
          const [x, y] = px(pontoDoEixo(eixos, i, 1));
          const [lx, ly] = pontoLabel(i);
          const cos = Math.cos(angulo(i));
          const anchor = Math.abs(cos) < 0.3 ? 'middle' : cos > 0 ? 'start' : 'end';
          const fraco = e.atual < e.alvo;
          return (
            <g key={e.k}>
              <circle cx={x} cy={y} r={2.5} fill={fraco ? COR.fraco : COR.atual} />
              <text x={lx} y={ly - 5} textAnchor={anchor} dominantBaseline="middle" fontSize="10.5" fontWeight="700" fill={COR.rotulo}>
                {e.emoji} {e.rotuloCurto}
              </text>
              <text x={lx} y={ly + 8} textAnchor={anchor} dominantBaseline="middle" fontSize="9.5" fontWeight="700" fill={fraco ? COR.fraco : COR.atual}>
                {Math.round(e.atual)}%
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-[11px] font-bold" style={{ color: escuro ? '#C1BECA' : '#5B5B66' }}>
        {faixa.emoji} {faixa.rotulo}
      </p>
    </div>
  );
}
