import React from 'react';

// 🏦 COFRE DA OPERAÇÃO — substitui a barrinha linear do andamento do ciclo.
// Cilindro vertical que enche de baixo pra cima conforme os 30 dias correm.
// ⚖️ Representa TEMPO (dia do ciclo), nunca dinheiro acumulado: encher o cofre
// com valor sugeriria quantia já devida — leitura que a operação não pode dar.
export default function CofreOperacao({ pct = 0, diaAtual = 0, estado = 'Ciclo físico', marcos = [] }) {
  const nivel = Math.max(0, Math.min(100, pct));

  return (
    <div className="flex items-stretch gap-3">
      {/* Cilindro */}
      <div className="relative w-16 shrink-0 overflow-hidden border border-pc-borda bg-pc-preto sm:w-20">
        <div className="h-[140px] w-full sm:h-[200px]">
          {/* Líquido */}
          <div
            className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
            style={{
              height: `${nivel}%`,
              background: 'linear-gradient(180deg, var(--pc-ouro-claro), var(--pc-ouro) 55%, #8A6A28)',
            }}
          >
            {/* Superfície do líquido: ondula de leve pra dar sensação de operação viva */}
            <div className="cofre-superficie absolute inset-x-0 -top-1 h-2 bg-pc-ouro-claro/80" />
          </div>

          {/* Riscos da régua (decorativos) */}
          <div className="absolute inset-0 flex flex-col justify-between py-1.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="mx-1 block h-px bg-pc-tinta/10" />
            ))}
          </div>
        </div>

        {/* Dia atual dentro do cofre */}
        <span className="pointer-events-none absolute inset-x-0 top-1.5 text-center font-mono text-[10px] font-bold text-pc-tinta">
          D+{diaAtual}
        </span>
      </div>

      {/* Marcos reais do ciclo, ancorados na altura que ocupam no cofre */}
      <div className="relative min-w-0 flex-1">
        <span className="border border-pc-ouro/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-pc-ouro">
          {estado}
        </span>
        <div className="relative mt-2 h-[104px] sm:h-[164px]">
          {marcos.map((m) => (
            <div
              key={m.rotulo}
              className="absolute inset-x-0 flex items-center gap-2"
              style={{ bottom: `${Math.max(0, Math.min(100, m.pct))}%` }}
            >
              <span className={`h-1.5 w-1.5 shrink-0 ${nivel >= m.pct ? 'bg-pc-ouro' : 'bg-pc-borda'}`} />
              <p className="min-w-0 truncate text-[10px] leading-tight text-pc-tinta-fraca">
                <strong className={nivel >= m.pct ? 'text-pc-tinta' : 'text-pc-tinta-fraca'}>{m.rotulo}</strong>
                {' · '}
                {m.texto}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes cofreOnda {
          0%, 100% { transform: translateY(0) scaleY(1); opacity: 0.85; }
          50% { transform: translateY(-2px) scaleY(1.4); opacity: 1; }
        }
        .cofre-superficie { animation: cofreOnda 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cofre-superficie { animation: none; }
        }
      `}</style>
    </div>
  );
}