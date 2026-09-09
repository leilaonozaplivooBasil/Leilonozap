import React from 'react';

// 🎯 O MAPA DO JOGADOR (DIR-109, 09/09/2026) — dono: "um mapa da pessoa,
// como se fosse um relatório, tipo de jogador de futebol que joga, que
// chuta... aonde ele está ruim ele tem que potencializar, onde ele tem
// que melhorar." O radar dos 5 eixos do EXECUTIVO IDEAL — a mesma conta
// que já vira barra em `ciclo.taxas`/`EXECUTIVO_IDEAL` (xgame.js) — só
// que de um jeito que mostra o FORMATO do desempenho num olhar só: onde a
// silhueta murcha é onde falta potencializar; onde estoura o alvo é onde
// já é ponto forte.
//
// `eixos`: [{ k, rotuloCurto, emoji, atual (0-100), alvo (0-100) }], na
// mesma ordem que a lista de barras já usa — sem duplicar a conta, só
// mudando como ela aparece.
export default function RadarEixos({ eixos = [], dialeto = 'claro', raio = 78 }) {
  const escuro = dialeto === 'escuro';
  const COR = escuro
    ? { grade: 'rgba(255,255,255,0.12)', alvo: '#fbbf24', atual: '#34d399', rotulo: '#C1BECA', fraco: '#f87171' }
    : { grade: '#E3E6EE', alvo: '#D97706', atual: 'var(--nz-verde)', rotulo: '#5B5B66', fraco: '#DC2626' };

  const n = eixos.length;
  if (n < 3) return null; // radar não faz sentido com menos de 3 eixos

  // 🐛 09/09/2026 — a primeira versão clipava "Produção"/"Real Time" nas
  // pontas: o texto do rótulo estica bem além do raio do pentágono, e o
  // <svg> corta tudo que passa do viewBox por padrão. A folga (PAD) reserva
  // espaço de sobra pro texto mais comprido, nas quatro direções.
  const PAD_X = 108;
  const PAD_Y = 40;
  const R = raio;
  const svgW = R * 2 + PAD_X * 2;
  const svgH = R * 2 + PAD_Y * 2;
  const cx = svgW / 2;
  const cy = svgH / 2;

  const angulo = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const ponto = (i, pct) => {
    const a = angulo(i);
    const r = (Math.max(0, Math.min(100, pct)) / 100) * R;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const pontoLabel = (i) => {
    const a = angulo(i);
    return [cx + (R + 14) * Math.cos(a), cy + (R + 14) * Math.sin(a)];
  };
  const poligono = (getPct) => eixos.map((e, i) => ponto(i, getPct(e)).join(',')).join(' ');
  const ANEIS = [25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height="auto" style={{ maxWidth: svgW, display: 'block', margin: '0 auto' }} role="img" aria-label="Radar dos 5 eixos do Executivo Ideal">
      {ANEIS.map((p) => (
        <polygon key={p} points={poligono(() => p)} fill="none" stroke={COR.grade} strokeWidth={1} />
      ))}
      {eixos.map((e, i) => {
        const [x, y] = ponto(i, 100);
        return <line key={e.k} x1={cx} y1={cy} x2={x} y2={y} stroke={COR.grade} strokeWidth={1} />;
      })}
      {/* alvo do Executivo Ideal — contorno tracejado */}
      <polygon points={poligono((e) => e.alvo)} fill="none" stroke={COR.alvo} strokeWidth={1.5} strokeDasharray="4 3" />
      {/* onde a pessoa está de verdade — preenchido */}
      <polygon points={poligono((e) => e.atual)} fill={COR.atual} fillOpacity={0.22} stroke={COR.atual} strokeWidth={2} />
      {eixos.map((e, i) => {
        const [x, y] = ponto(i, 100);
        const [px, py] = pontoLabel(i);
        const cos = Math.cos(angulo(i));
        const anchor = Math.abs(cos) < 0.3 ? 'middle' : cos > 0 ? 'start' : 'end';
        const fraco = e.atual < e.alvo;
        return (
          <g key={e.k}>
            <circle cx={x} cy={y} r={2.5} fill={fraco ? COR.fraco : COR.atual} />
            <text x={px} y={py - 5} textAnchor={anchor} dominantBaseline="middle" fontSize="10.5" fontWeight="700" fill={COR.rotulo}>
              {e.emoji} {e.rotuloCurto}
            </text>
            <text x={px} y={py + 8} textAnchor={anchor} dominantBaseline="middle" fontSize="9.5" fontWeight="700" fill={fraco ? COR.fraco : COR.atual}>
              {Math.round(e.atual)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}
