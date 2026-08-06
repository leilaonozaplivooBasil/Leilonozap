import React from 'react';

// 📊 BARRA DO HISTÓRICO — quanto já girou dentro do ciclo, avançando da esquerda
// pra direita até o repasse previsto. Soma os dias fechados de giro com o que já
// caiu HOJE. Valor de referência do ciclo, nunca valor devido.
const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v || 0);

export default function BarraHistoricoRepasse({
  acumulado = 0,
  previsto = 0,
  cotaDia = 0,
  diasDeGiro = 0,
  diaInicio = 10,
  diaRepasse = 30,
}) {
  const pct = previsto > 0 ? Math.max(0, Math.min(100, (acumulado / previsto) * 100)) : 0;
  const marcaInicio = (diaInicio / diaRepasse) * 100;

  return (
    <div>
      <div className="relative h-2.5 w-full overflow-hidden border border-pc-borda bg-pc-preto">
        <div
          className="barra-hist h-full"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #8A6A28, var(--pc-ouro) 60%, var(--pc-ouro-claro))',
          }}
        />
        <span
          className="pointer-events-none absolute inset-y-0 w-px bg-pc-tinta/40"
          style={{ left: `${marcaInicio}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-xs font-bold tabular-nums text-pc-ouro">{brl(acumulado)} já girados</p>
        <p className="text-[11px] tabular-nums text-pc-tinta-fraca">de {brl(previsto)} previstos</p>
      </div>
      <p className="mt-1 text-[10px] tabular-nums text-pc-tinta-fraca">
        {diasDeGiro} {diasDeGiro === 1 ? 'dia' : 'dias'} de giro · cota de {brl(cotaDia)} por dia · início do giro
        no {diaInicio}º dia
      </p>

      <style>{`
        .barra-hist { transition: width 900ms linear; }
        @media (prefers-reduced-motion: reduce) {
          .barra-hist { transition: none; }
        }
      `}</style>
    </div>
  );
}