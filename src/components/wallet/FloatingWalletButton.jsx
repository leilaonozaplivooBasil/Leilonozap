import React from 'react';
import { fmtBR } from '@/lib/money';
import { Wallet } from 'lucide-react';
import useScrollDrift from '@/hooks/useScrollDrift';

/**
 * Botão flutuante da carteira — lateral esquerda, liquid glass em paleta
 * esmeralda uniforme (verde da logo NoZap) com halo pulsante suave.
 */
export default function FloatingWalletButton({ balance, onClick }) {
  const hasBalance = typeof balance === 'number' && balance < 999999;
  // 🌊 Drift magnético: contra-movimento suave conforme a página rola
  const driftCls = useScrollDrift();
  return (
    <button onClick={onClick} className={`fwb ${driftCls}`} title="Minha Carteira">
      <span className="fwb-icon">
        <Wallet size={16} strokeWidth={2.3} />
      </span>
      <span className="fwb-text">
        <span className="fwb-label">Carteira</span>
        <span className="fwb-value">{hasBalance ? `R$ ${fmtBR(balance)}` : '· · ·'}</span>
      </span>
      <style>{`
        .fwb {
          position: fixed;
          z-index: 60;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 18px 8px 8px;
          border-radius: 9999px;
          background: linear-gradient(112deg, rgba(16, 185, 129, 0.14), rgba(6, 40, 27, 0.82) 50%, rgba(4, 28, 19, 0.88));
          border: 1px solid rgba(52, 211, 153, 0.4);
          backdrop-filter: blur(18px) saturate(1.35);
          -webkit-backdrop-filter: blur(18px) saturate(1.35);
          box-shadow:
            0 6px 24px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
          cursor: pointer;
          animation: fwb-halo 3s ease-in-out infinite;
          /* transform fica por conta do drift magnético (useScrollDrift) */
          transition: border-color 0.2s ease, transform .5s cubic-bezier(.22,.61,.36,1);
        }
        .fwb:hover {
          border-color: rgba(110, 231, 183, 0.8);
        }
        @media (max-width: 1023px) { .fwb { top: 108px; right: 12px; } }
        @media (min-width: 1024px) { .fwb { top: 170px; left: 16px; } }

        /* Halo esmeralda uniforme, respirando devagar */
        @keyframes fwb-halo {
          0%, 100% {
            box-shadow:
              0 6px 24px rgba(0, 0, 0, 0.45),
              0 0 0 0 rgba(52, 211, 153, 0.32),
              inset 0 1px 0 rgba(255, 255, 255, 0.14);
          }
          50% {
            box-shadow:
              0 6px 24px rgba(0, 0, 0, 0.45),
              0 0 0 8px rgba(52, 211, 153, 0),
              0 0 30px rgba(52, 211, 153, 0.30),
              inset 0 1px 0 rgba(255, 255, 255, 0.14);
          }
        }

        .fwb-icon {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 9999px;
          background: linear-gradient(140deg, #34d399, #10b981 55%, #059669);
          color: #04281a;
          box-shadow:
            0 3px 12px rgba(16, 185, 129, 0.5),
            inset 0 1px 1px rgba(255, 255, 255, 0.5);
        }
        .fwb-text { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.15; }
        .fwb-label {
          font-size: 8.5px; font-weight: 700; letter-spacing: 0.2em;
          text-transform: uppercase; color: rgba(110, 231, 183, 0.85);
        }
        .fwb-value {
          font-size: 14.5px; font-weight: 800; color: #f2fdf8;
          font-variant-numeric: tabular-nums; letter-spacing: 0.01em;
        }
      `}</style>
    </button>
  );
}
