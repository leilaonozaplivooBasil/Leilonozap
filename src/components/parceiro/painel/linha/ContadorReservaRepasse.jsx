import React from 'react';

// 💰 CONTADOR DE RESERVA — sobe em DEGRAUS, só quando uma venda cai no quadro.
// ⚖️ Nunca sobe sozinho e NUNCA passa do repasse previsto do ciclo (teto):
// o valor do repasse é o do contrato e é pago no fechamento.
const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v || 0);

export default function ContadorReservaRepasse({ valor = 0, alvo = 0 }) {
  const mostrado = Math.min(valor, alvo);

  return (
    <div className="border-b border-pc-borda pb-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-pc-tinta-fraca">
        Reservado para o seu repasse deste ciclo
      </p>
      <p
        key={Math.round(mostrado * 100)}
        className="reserva-degrau mt-1 font-mono text-3xl font-black tabular-nums tracking-tight text-pc-ouro sm:text-4xl"
      >
        {brl(mostrado)}
      </p>
      <p className="mt-1 text-[11px] text-pc-tinta-fraca">
        Repasse previsto no fechamento: <strong className="text-pc-tinta">{brl(alvo)}</strong>
      </p>

      <style>{`
        @keyframes reservaDegrau {
          0% { transform: translateY(4px); opacity: 0.6; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .reserva-degrau { animation: reservaDegrau 0.35s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .reserva-degrau { animation: none; }
        }
      `}</style>
    </div>
  );
}