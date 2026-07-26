import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Plus } from 'lucide-react';

/**
 * Botão flutuante da carteira — mostra o saldo REAL (saldo_disponivel via backend)
 * e abre o WalletDrawer sem sair da página.
 */
export default function FloatingWalletButton({ balance, onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, type: 'spring', damping: 20 }}
      onClick={onClick}
      className="floating-wallet-btn group"
      title="Minha Carteira"
    >
      <span className="fw-icon">
        <Wallet className="w-4 h-4 text-white" />
      </span>
      <span className="fw-balance">
        {typeof balance === 'number' && balance < 999999
          ? `R$ ${balance.toFixed(2).replace('.', ',')}`
          : 'Carteira'}
      </span>
      <span className="fw-plus">
        <Plus className="w-3.5 h-3.5" />
      </span>
      <style>{`
        .floating-wallet-btn {
          position: fixed;
          z-index: 60;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px 8px 8px;
          border-radius: 9999px;
          background: linear-gradient(135deg, rgba(16, 90, 50, 0.92), rgba(6, 60, 35, 0.92));
          border: 1px solid rgba(74, 222, 128, 0.35);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255,255,255,0.04) inset;
          backdrop-filter: blur(10px);
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .floating-wallet-btn:hover {
          transform: translateY(-1px) scale(1.02);
          border-color: rgba(74, 222, 128, 0.7);
          box-shadow: 0 10px 28px rgba(16, 185, 129, 0.25);
        }
        @media (max-width: 1023px) {
          .floating-wallet-btn { top: 80px; right: 12px; }
        }
        @media (min-width: 1024px) {
          .floating-wallet-btn { top: 84px; left: 20px; }
        }
        .fw-icon {
          display: flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 9999px;
          background: linear-gradient(135deg, #16a34a, #059669);
          box-shadow: 0 2px 8px rgba(5, 150, 105, 0.5);
        }
        .fw-balance {
          color: #ecfdf5; font-weight: 800; font-size: 14px; letter-spacing: 0.01em;
          font-variant-numeric: tabular-nums;
        }
        .fw-plus {
          display: flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; border-radius: 9999px;
          background: rgba(74, 222, 128, 0.18);
          color: #4ade80;
          border: 1px solid rgba(74, 222, 128, 0.4);
          transition: background 0.15s ease;
        }
        .floating-wallet-btn:hover .fw-plus { background: rgba(74, 222, 128, 0.35); }
      `}</style>
    </motion.button>
  );
}
