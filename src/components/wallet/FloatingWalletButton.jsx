import React from 'react';
import { Wallet } from 'lucide-react';

/**
 * Botão flutuante da carteira — canto lateral esquerdo, liquid glass na paleta
 * da logo (verde NoZap) com pulso verde constante. Abre o WalletDrawer.
 */
export default function FloatingWalletButton({ balance, onClick }) {
  const hasBalance = typeof balance === 'number' && balance < 999999;
  return (
    <button onClick={onClick} className="fwb" title="Minha Carteira">
      <span className="fwb-pulse" aria-hidden="true" />
      <span className="fwb-icon">
        <Wallet size={15} strokeWidth={2.4} />
      </span>
      <span className="fwb-text">
        <span className="fwb-label">Carteira</span>
        <span className="fwb-value">{hasBalance ? `R$ ${balance.toFixed(2).replace('.', ',')}` : '· · ·'}</span>
      </span>
      <span className="fwb-dot" aria-hidden="true" />
      <style>{`
        .fwb {
          position: fixed;
          z-index: 60;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px 8px 9px;
          border-radius: 9999px;
          background: linear-gradient(112deg, rgba(34, 197, 94, 0.16), rgba(10, 46, 30, 0.62) 55%, rgba(5, 26, 17, 0.72));
          border: 1px solid rgba(74, 222, 128, 0.38);
          backdrop-filter: blur(16px) saturate(1.3);
          -webkit-backdrop-filter: blur(16px) saturate(1.3);
          box-shadow: 0 6px 22px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.12);
          cursor: pointer;
          transition: border-color 0.18s ease, transform 0.18s ease;
        }
        .fwb:hover { border-color: rgba(74, 222, 128, 0.75); transform: translateY(-1px); }
        @media (max-width: 1023px) { .fwb { top: 80px; right: 12px; } }
        @media (min-width: 1024px) { .fwb { top: 96px; left: 16px; } }

        /* Pulso verde — anel que respira atrás do botão */
        .fwb-pulse {
          position: absolute; inset: -1px;
          border-radius: 9999px;
          pointer-events: none;
          animation: fwb-breathe 2.6s ease-in-out infinite;
        }
        @keyframes fwb-breathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.45), 0 0 12px rgba(74, 222, 128, 0.15); }
          50%      { box-shadow: 0 0 0 7px rgba(74, 222, 128, 0.0), 0 0 26px rgba(74, 222, 128, 0.35); }
        }

        .fwb-icon {
          display: flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 9999px;
          background: linear-gradient(135deg, #22c55e, #059669);
          color: #eafff3;
          box-shadow: 0 2px 10px rgba(16, 185, 129, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }
        .fwb-text { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.12; }
        .fwb-label {
          font-size: 8.5px; font-weight: 700; letter-spacing: 0.18em;
          text-transform: uppercase; color: rgba(167, 243, 208, 0.75);
        }
        .fwb-value {
          font-size: 14px; font-weight: 800; color: #f6fef9;
          font-variant-numeric: tabular-nums; letter-spacing: 0.01em;
        }
        .fwb-dot {
          width: 7px; height: 7px; border-radius: 9999px;
          background: #4ade80;
          box-shadow: 0 0 8px rgba(74, 222, 128, 0.9);
          animation: fwb-dot-blink 2.6s ease-in-out infinite;
        }
        @keyframes fwb-dot-blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.8); }
        }
      `}</style>
    </button>
  );
}
