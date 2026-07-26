import React from 'react';
import { Wallet } from 'lucide-react';

/**
 * Botão flutuante da carteira — mostra o saldo REAL (saldo_disponivel via backend)
 * e abre o WalletDrawer sem sair da página. Visual integrado ao header do site:
 * glass escuro, fio sutil, ícone 3D da navbar.
 */
export default function FloatingWalletButton({ balance, onClick }) {
  const hasBalance = typeof balance === 'number' && balance < 999999;
  return (
    <button onClick={onClick} className="fwb" title="Minha Carteira">
      <img
        src="/icons/money-3d.png"
        alt=""
        className="fwb-icon"
        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
      />
      <span className="fwb-icon-fallback" style={{ display: 'none' }}>
        <Wallet size={15} strokeWidth={2.2} />
      </span>
      <span className="fwb-text">
        <span className="fwb-label">Carteira</span>
        <span className="fwb-value">{hasBalance ? `R$ ${balance.toFixed(2).replace('.', ',')}` : '· · ·'}</span>
      </span>
      <style>{`
        .fwb {
          position: fixed;
          z-index: 60;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 7px 14px 7px 9px;
          border-radius: 12px;
          background: rgba(13, 17, 15, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.09);
          backdrop-filter: blur(14px) saturate(1.2);
          -webkit-backdrop-filter: blur(14px) saturate(1.2);
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
          cursor: pointer;
          transition: border-color 0.18s ease, background 0.18s ease;
        }
        .fwb:hover {
          border-color: rgba(52, 211, 153, 0.4);
          background: rgba(16, 22, 19, 0.88);
        }
        @media (max-width: 1023px) { .fwb { top: 80px; right: 12px; } }
        @media (min-width: 1024px) { .fwb { top: 84px; left: 20px; } }
        .fwb-icon { width: 26px; height: 26px; object-fit: contain; }
        .fwb-icon-fallback {
          width: 26px; height: 26px; border-radius: 8px;
          align-items: center; justify-content: center;
          background: rgba(52, 211, 153, 0.12);
          color: #34d399;
        }
        .fwb-text { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.15; }
        .fwb-label {
          font-size: 9px; font-weight: 600; letter-spacing: 0.14em;
          text-transform: uppercase; color: rgba(255, 255, 255, 0.45);
        }
        .fwb-value {
          font-size: 13.5px; font-weight: 700; color: #f4f7f5;
          font-variant-numeric: tabular-nums; letter-spacing: 0.01em;
        }
      `}</style>
    </button>
  );
}
