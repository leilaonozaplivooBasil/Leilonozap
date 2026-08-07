import React from 'react';
import { formatBRL } from './aporteUtils';

// Totais do período. Só APORTES PAGOS somam no total aportado.
export default function AportesResumo({ totalPago, qtdPago, totalPendente, qtdPendente, qtdDivergente }) {
  const cards = [
    { rotulo: 'Total aportado (pago)', valor: formatBRL(totalPago), sub: `${qtdPago} aporte(s)`, destaque: true },
    { rotulo: 'Aguardando pagamento', valor: formatBRL(totalPendente), sub: `${qtdPendente} aporte(s)` },
    { rotulo: 'Divergências', valor: String(qtdDivergente), sub: 'pago no Mercado Pago, pendente aqui', alerta: qtdDivergente > 0 },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((c) => (
        <div
          key={c.rotulo}
          className={`rounded-xl border p-4 ${c.alerta ? 'border-red-500/40 bg-red-500/5' : 'border-pc-borda bg-pc-preto-2'}`}
        >
          <p className="text-[11px] uppercase tracking-wide text-pc-tinta-fraca">{c.rotulo}</p>
          <p className={`mt-1 text-2xl font-bold ${c.alerta ? 'text-red-400' : c.destaque ? 'text-pc-ouro' : 'text-pc-tinta'}`}>
            {c.valor}
          </p>
          <p className="mt-0.5 text-xs text-pc-tinta-fraca">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}