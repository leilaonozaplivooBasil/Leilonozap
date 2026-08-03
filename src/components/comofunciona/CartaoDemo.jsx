import React from 'react';
import { RefreshCw } from 'lucide-react';

// Réplica EXATA do cartão da Carteira Digital (WalletDrawer) — mesmo gradiente,
// brilho, chip, martelo 3D e tipografia. Estático: não lê saldo nem API.
export default function CartaoDemo() {
  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-[440px]">
        <div className="nzdemo-card relative w-full aspect-[1.62/1] rounded-2xl overflow-hidden select-none">
          <div className="nzdemo-card-sheen" />
          <img
            src="/martelo-3d.png"
            alt=""
            className="absolute -right-5 -bottom-6 w-32 h-32 object-contain opacity-[0.14] rotate-[-18deg] pointer-events-none"
          />
          <div className="relative h-full flex flex-col justify-between p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <img src="/brand/logo-horizontal-dark.webp" alt="Leilão NoZap" className="h-7 object-contain" />
              <span className="p-1.5 rounded-lg text-emerald-100/70">
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-200/70 mb-0.5">Saldo disponível</p>
                <p className="text-[1.9rem] sm:text-[2.1rem] leading-none font-extrabold text-white tracking-tight tabular-nums drop-shadow">
                  R$ 338,64
                </p>
              </div>
              <div className="nzdemo-chip" />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-emerald-200/60">Titular</p>
                <p className="text-xs sm:text-sm font-bold text-white uppercase tracking-[0.12em]">
                  Seu nome aqui
                </p>
              </div>
              <p className="text-xs font-bold text-emerald-100/80 tracking-[0.25em] tabular-nums">
                •••• 6E5F
              </p>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .nzdemo-card {
          background:
            radial-gradient(ellipse at 20% -10%, rgba(74, 222, 128, 0.22), transparent 55%),
            radial-gradient(ellipse at 105% 110%, rgba(245, 158, 11, 0.10), transparent 45%),
            linear-gradient(135deg, #0d4d2e 0%, #0a3d24 45%, #052818 100%);
          border: 1px solid rgba(74, 222, 128, 0.35);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.14);
        }
        .nzdemo-card-sheen {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.09) 45%, rgba(255, 255, 255, 0.02) 55%, transparent 70%);
        }
        .nzdemo-chip {
          width: 38px; height: 28px; border-radius: 6px;
          background: linear-gradient(135deg, #f5d178, #d9a13c 55%, #b57e22);
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.55), inset 0 -1px 2px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.35);
          position: relative;
        }
        .nzdemo-chip::before {
          content: ''; position: absolute; inset: 5px 7px;
          border: 1px solid rgba(90, 60, 10, 0.5); border-radius: 3px;
        }
      `}</style>
    </div>
  );
}