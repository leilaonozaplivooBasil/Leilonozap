import React from 'react';
import { CheckCircle2 } from 'lucide-react';

// 💰 CONTADOR DO REPASSE DO DIA — mostra a COTA DIÁRIA sendo contabilizada.
// Começa em R$ 0,00 e SOBE ANIMADO a cada venda que cai (contagem crescente,
// não troca seca de número), congelando exatamente na cota do dia.
// ⚖️ O repasse é o previsto no contrato e é pago no fechamento do 30º dia.
const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v || 0);

const DURACAO = 600;
const suave = (t) => 1 - Math.pow(1 - t, 3);

export default function ContadorReservaRepasse({ valor = 0, cotaDia = 0, alvo = 0, diaRepasse = 30 }) {
  const destino = Math.min(valor, cotaDia);
  const [exibido, setExibido] = React.useState(0);
  const [pulsando, setPulsando] = React.useState(false);
  const deRef = React.useRef(0);

  // 📈 Sobe do valor antigo até o novo em ~600ms (rAF, easing suave).
  React.useEffect(() => {
    const de = deRef.current;
    if (de === destino) return;

    const reduz = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduz) {
      deRef.current = destino;
      setExibido(destino);
      return;
    }

    setPulsando(true);
    const t0 = performance.now();
    let raf;
    const passo = (agora) => {
      const t = Math.min(1, (agora - t0) / DURACAO);
      setExibido(de + (destino - de) * suave(t));
      if (t < 1) raf = requestAnimationFrame(passo);
      else {
        deRef.current = destino;
        setPulsando(false);
      }
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [destino]);

  const metaAtendida = cotaDia > 0 && destino >= cotaDia - 0.005;

  return (
    <div className="border-b border-pc-borda pb-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-pc-tinta-fraca">
        Repasse do dia sendo contabilizado
      </p>
      <p
        className={`mt-1 origin-left font-mono text-3xl font-black tabular-nums tracking-tight text-pc-ouro sm:text-4xl ${
          pulsando ? 'reserva-pulso' : ''
        }`}
      >
        {brl(exibido)}
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
        @keyframes reservaPulso {
          0%, 100% { transform: scale(1); }
          45% { transform: scale(1.06); }
        }
        .reserva-pulso { animation: reservaPulso 0.6s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .reserva-pulso { animation: none; }
        }
      `}</style>
    </div>
  );
}