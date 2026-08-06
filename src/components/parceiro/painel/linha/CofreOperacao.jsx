import React from 'react';

// 🏦 COFRE DA OPERAÇÃO — cilindro vertical com ÁGUA DOURADA que sobe.
// A superfície ondula (duas ondas em velocidades e sentidos diferentes), há
// reflexo interno e bolhas subindo do fundo: leitura de operação viva.
// ⚖️ O nível representa TEMPO (fração do dia do ciclo), nunca dinheiro
// acumulado: encher com valor sugeriria quantia já devida.
export default function CofreOperacao({ pct = 0, diaAtual = 0, estado = 'Ciclo físico', marcos = [], hero = null }) {
  const base = Math.max(0, Math.min(100, pct));
  // 👆 Toque/hover: a água dá um "gole" pra cima e volta — sensação de vivo.
  const [tocado, setTocado] = React.useState(false);
  const reduz = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const nivel = tocado && !reduz ? Math.min(100, base + 6) : base;

  const reagir = () => {
    if (reduz) return;
    setTocado(true);
    setTimeout(() => setTocado(false), 700);
  };

  return (
    <div className="flex items-stretch gap-3">
      {/* Cilindro */}
      <div
        className="relative w-16 shrink-0 overflow-hidden border border-pc-borda bg-pc-preto sm:w-20"
        onMouseEnter={reagir}
        onTouchStart={reagir}
      >
        <div className="h-[140px] w-full sm:h-[200px]">
          {/* Líquido */}
          <div
            className="cofre-liquido absolute inset-x-0 bottom-0 transition-[height] duration-1000 ease-linear"
            style={{
              height: `${nivel}%`,
              background: 'linear-gradient(180deg, var(--pc-ouro-claro), var(--pc-ouro) 45%, #8A6A28)',
            }}
          >
            {/* 🌊 Superfície: duas ondas sobrepostas, sentidos e velocidades diferentes */}
            <svg
              className="pointer-events-none absolute inset-x-0 -top-[7px] h-[10px] w-full overflow-visible"
              viewBox="0 0 120 10"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                className="cofre-onda-a"
                d="M0 6 Q 10 2 20 6 T 40 6 T 60 6 T 80 6 T 100 6 T 120 6 T 140 6 V10 H0 Z"
                fill="var(--pc-ouro-claro)"
                opacity="0.85"
              />
              <path
                className="cofre-onda-b"
                d="M0 7 Q 15 4 30 7 T 60 7 T 90 7 T 120 7 T 150 7 V10 H0 Z"
                fill="var(--pc-ouro)"
                opacity="0.7"
              />
            </svg>

            {/* 📍 Agulha: linha fina no nível exato */}
            <div className="absolute inset-x-0 top-0 h-px bg-pc-ouro-claro" />

            {/* ✨ Reflexo diagonal lento */}
            <div className="cofre-reflexo pointer-events-none absolute inset-0" />

            {/* 🫧 Bolhas subindo do fundo */}
            {[
              { esq: '22%', tam: 4, dur: '6s', atraso: '0s' },
              { esq: '55%', tam: 3, dur: '8s', atraso: '1.6s' },
              { esq: '72%', tam: 5, dur: '7s', atraso: '3.2s' },
              { esq: '38%', tam: 3, dur: '9s', atraso: '4.6s' },
            ].map((b) => (
              <span
                key={b.esq}
                className="cofre-bolha absolute rounded-full bg-white/35"
                style={{
                  left: b.esq,
                  width: b.tam,
                  height: b.tam,
                  animationDuration: b.dur,
                  animationDelay: b.atraso,
                }}
              />
            ))}
          </div>

          {/* Riscos da régua (decorativos) */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-1.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="mx-1 block h-px bg-pc-tinta/10" />
            ))}
          </div>
        </div>

        {/* Dia atual dentro do cofre */}
        <span className="pointer-events-none absolute inset-x-0 top-1.5 text-center font-mono text-[10px] font-bold text-pc-tinta">
          D+{Number(diaAtual).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
        </span>
      </div>

      {/* Marcos reais do ciclo, ancorados na altura que ocupam no cofre */}
      <div className="relative min-w-0 flex-1">
        {hero && <div className="mb-3">{hero}</div>}
        {/* Selo em bloco próprio: nunca colide com os marcos logo abaixo */}
        <div>
          <span className="inline-block border border-pc-ouro/50 px-2 py-1 text-[9px] font-semibold uppercase leading-none tracking-[0.14em] text-pc-ouro">
            {estado}
          </span>
        </div>
        {/* Marcos em lista (do topo do ciclo pra base): texto quebra em vez de cortar */}
        <ul className="mt-3 space-y-2">
          {[...marcos]
            .sort((a, b) => b.pct - a.pct)
            .map((m) => (
              <li key={m.rotulo} className="flex items-start gap-2">
                <span
                  className={`mt-1 h-1.5 w-1.5 shrink-0 ${nivel >= m.pct ? 'bg-pc-ouro' : 'bg-pc-borda'}`}
                />
                <p className="min-w-0 text-[10px] leading-snug text-pc-tinta-fraca">
                  <strong className={nivel >= m.pct ? 'text-pc-tinta' : 'text-pc-tinta-fraca'}>{m.rotulo}</strong>
                  {' · '}
                  {m.texto}
                </p>
              </li>
            ))}
        </ul>
      </div>

      <style>{`
        @keyframes cofreOndaA {
          from { transform: translateX(0); }
          to { transform: translateX(-40px); }
        }
        @keyframes cofreOndaB {
          from { transform: translateX(-30px); }
          to { transform: translateX(0); }
        }
        .cofre-onda-a { animation: cofreOndaA 3s linear infinite; }
        .cofre-onda-b { animation: cofreOndaB 4.5s linear infinite; }

        @keyframes cofreReflexo {
          0%, 100% { opacity: 0.18; transform: translateY(0); }
          50% { opacity: 0.34; transform: translateY(-6px); }
        }
        .cofre-reflexo {
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 48%, transparent 62%);
          animation: cofreReflexo 5s ease-in-out infinite;
        }

        @keyframes cofreBolha {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          15% { opacity: 0.8; }
          100% { transform: translateY(-190px) scale(1.1); opacity: 0; }
        }
        .cofre-bolha { bottom: 4px; animation-name: cofreBolha; animation-timing-function: linear; animation-iteration-count: infinite; }

        @media (prefers-reduced-motion: reduce) {
          .cofre-onda-a, .cofre-onda-b, .cofre-reflexo, .cofre-bolha { animation: none; }
          .cofre-bolha { display: none; }
          .cofre-liquido { transition: none; }
        }
      `}</style>
    </div>
  );
}