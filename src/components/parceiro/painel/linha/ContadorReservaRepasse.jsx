import React from 'react';
import { CheckCircle2 } from 'lucide-react';

// 💰 CONTADOR DO REPASSE DO DIA — mostra a COTA DIÁRIA sendo contabilizada,
// não o ciclo inteiro. Sobe em degraus (só quando uma venda cai) e CONGELA
// exatamente na cota do dia.
// ⚖️ O repasse é o previsto no contrato e é pago no fechamento do 30º dia.
const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v || 0);

export default function ContadorReservaRepasse({ valor = 0, cotaDia = 0, alvo = 0, diaRepasse = 30 }) {
  const mostrado = Math.min(valor, cotaDia);
  const metaAtendida = cotaDia > 0 && mostrado >= cotaDia - 0.005;

  return (
    <div className="border-b border-pc-borda pb-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-pc-tinta-fraca">
        Repasse do dia sendo contabilizado
      </p>
      <p
        key={Math.round(mostrado * 100)}
        className="reserva-degrau mt-1 font-mono text-3xl font-black tabular-nums tracking-tight text-pc-ouro sm:text-4xl"
      >
        {brl(mostrado)}
      </p>
      <p className="mt-1 text-[11px] text-pc-tinta-fraca">
        Cota de hoje: <strong className="text-pc-tinta">{brl(cotaDia)}</strong> · Repasse do ciclo:{' '}
        <strong className="text-pc-tinta">{brl(alvo)}</strong> ({diaRepasse}º dia)
      </p>

      {metaAtendida && (
        <div className="mt-3 border border-pc-ouro bg-pc-ouro/10 px-3 py-2.5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-pc-ouro">
            <CheckCircle2 className="h-4 w-4" strokeWidth={2} /> Meta do dia atendida — repasse contabilizado
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-pc-tinta-fraca">
            O giro continua amanhã. O repasse é pago no fechamento do {diaRepasse}º dia, com demonstrativo na
            Prestação de Contas.
          </p>
        </div>
      )}

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