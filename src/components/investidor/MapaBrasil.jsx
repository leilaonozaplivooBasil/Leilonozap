import React, { useMemo, useState } from 'react';
import brazil from '@svg-maps/brazil';

// 🗺️ MAPA DO BRASIL COM CALOR POR ESTADO — DIR-190 (30/09/2026)
// Contornos do pacote @svg-maps/brazil (MIT). A cor de cada estado sai da
// quantidade de pessoas (raiz quadrada, para o Rio não apagar o resto do país).
// Tocar num estado seleciona; o painel ao lado mostra os números dele.

const NOMES = Object.fromEntries(brazil.locations.map((l) => [l.id.toUpperCase(), l.name]));

function corDoCalor(t) {
  // t em [0,1] → do verde-escuro apagado ao dourado aceso
  if (t <= 0) return '#101a15';
  const paradas = [
    [0.0, [16, 42, 30]],
    [0.35, [21, 128, 61]],
    [0.7, [52, 211, 153]],
    [1.0, [245, 196, 81]],
  ];
  for (let i = 1; i < paradas.length; i += 1) {
    const [t0, c0] = paradas[i - 1];
    const [t1, c1] = paradas[i];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      const c = c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  return '#F5C451';
}

export function nomeDoEstado(uf) {
  return NOMES[String(uf || '').toUpperCase()] || uf;
}

export default function MapaBrasil({ porUf = [], campo = 'n', selecionado = null, onSelecionar }) {
  const [hover, setHover] = useState(null);
  const valores = useMemo(() => {
    const m = {};
    porUf.forEach((r) => { m[String(r.uf).toUpperCase()] = Number(r[campo]) || 0; });
    return m;
  }, [porUf, campo]);
  const maximo = useMemo(() => Math.max(1, ...Object.values(valores)), [valores]);
  const ativo = hover || selecionado;

  return (
    <div className="relative" data-teste="mapa-brasil">
      <svg viewBox={brazil.viewBox} className="w-full h-auto" role="img" aria-label="Mapa do Brasil com pessoas por estado">
        {brazil.locations.map((l) => {
          const uf = l.id.toUpperCase();
          const v = valores[uf] || 0;
          const t = v > 0 ? Math.sqrt(v / maximo) : 0;
          const ehAtivo = ativo === uf;
          return (
            <path
              key={l.id}
              d={l.path}
              data-uf={uf}
              fill={corDoCalor(t)}
              stroke={ehAtivo ? '#FFFFFF' : 'rgba(255,255,255,0.18)'}
              strokeWidth={ehAtivo ? 2.2 : 0.8}
              style={{ cursor: 'pointer', transition: 'fill 250ms ease, stroke 150ms ease' }}
              onMouseEnter={() => setHover(uf)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelecionar?.(uf)}
            >
              <title>{`${l.name}: ${v} ${v === 1 ? 'pessoa' : 'pessoas'}`}</title>
            </path>
          );
        })}
      </svg>
      {ativo && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-lg border border-white/15 bg-gray-950/90 px-3 py-1.5 text-xs text-white shadow-lg">
          <span className="font-bold">{nomeDoEstado(ativo)}</span> · {valores[ativo] || 0} {(valores[ativo] || 0) === 1 ? 'pessoa' : 'pessoas'}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500">
        <span>menos</span>
        <div className="h-2 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${corDoCalor(0.05)}, ${corDoCalor(0.35)}, ${corDoCalor(0.7)}, ${corDoCalor(1)})` }} />
        <span>mais</span>
      </div>
    </div>
  );
}
