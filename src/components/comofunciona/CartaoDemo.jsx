import React from 'react';
import { Gavel, RefreshCw } from 'lucide-react';

// Réplica visual do cartão da Carteira Digital — 100% estático, sem API e sem
// saldo real. Serve só para ilustrar a lâmina "Como o seu saldo se movimenta".
export default function CartaoDemo() {
  return (
    <div className="flex w-full justify-center [perspective:1200px]">
      <div
        className="relative w-full max-w-[420px] overflow-hidden rounded-[22px] p-6 text-left"
        style={{
          background: 'linear-gradient(135deg, #0C1F16 0%, #1B7A48 58%, #0F3B25 100%)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
        }}
      >
        <Gavel
          className="pointer-events-none absolute bottom-5 right-8 h-20 w-20 text-white/10"
          aria-hidden="true"
        />

        <div className="flex items-start justify-between">
          <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-white">
            Leilão NoZap
          </span>
          <RefreshCw className="h-4 w-4 text-white/60" aria-hidden="true" />
        </div>

        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
          Saldo disponível
        </p>
        <div className="mt-1 flex items-center justify-between gap-4">
          <span className="text-[2rem] font-bold leading-none tracking-tight text-white">
            R$ 338,64
          </span>
          <span className="h-7 w-10 shrink-0 rounded-[6px] bg-gradient-to-br from-[#E8D08A] to-[#C9A227]" />
        </div>

        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
          Titular
        </p>
        <div className="mt-1 flex items-end justify-between gap-4">
          <span className="text-[15px] font-semibold uppercase tracking-wide text-white">
            Seu nome aqui
          </span>
          <span className="text-[13px] tracking-[0.22em] text-white/70">•••• 6E5F</span>
        </div>
      </div>
    </div>
  );
}