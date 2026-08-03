import React from 'react';
import { Gavel, RefreshCw } from 'lucide-react';

// Réplica visual do cartão da Carteira Digital — 100% estático, sem API e sem
// saldo real. Serve só para ilustrar a lâmina "Como o seu saldo se movimenta".
export default function CartaoDemo() {
  return (
    <div className="flex w-full justify-center">
      <div
        className="relative flex w-full max-w-[443px] flex-col overflow-hidden rounded-[26px] px-6 py-6 text-left sm:px-7"
        style={{
          minHeight: '252px',
          background:
            'radial-gradient(120% 120% at 30% 40%, #2A8A55 0%, #1B6B41 45%, #0E3D26 100%)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
        }}
      >
        {/* Martelo em marca d'água, canto inferior direito */}
        <Gavel
          className="pointer-events-none absolute -bottom-2 right-10 h-28 w-28 text-white/[0.13]"
          aria-hidden="true"
        />

        {/* Topo: logo + ícone de atualizar */}
        <div className="flex items-start justify-between">
          <img
            src="https://media.base44.com/images/public/68d536db3c26ff51f79c4137/a4d99a15d_image.png"
            alt="Leilão NoZap"
            className="h-9 w-auto sm:h-10"
            decoding="async"
          />
          <RefreshCw className="h-5 w-5 text-white/70" aria-hidden="true" />
        </div>

        {/* Saldo + chip dourado */}
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65 sm:text-[11px]">
          Saldo disponível
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <span className="text-[1.85rem] font-bold leading-none tracking-tight text-white sm:text-[2.35rem]">
            R$ 338,64
          </span>
          <span
            className="h-8 w-11 shrink-0 rounded-[8px] sm:h-9 sm:w-12"
            style={{
              background: 'linear-gradient(160deg, #F3D98C 0%, #D9A63A 55%, #B8860B 100%)',
              border: '1px solid rgba(255,255,255,0.35)',
              boxShadow: 'inset 0 0 0 3px rgba(255,255,255,0.22)',
            }}
          />
        </div>

        {/* Titular + últimos dígitos */}
        <p className="mt-auto pt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60 sm:text-[11px]">
          Titular
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <span className="text-[0.95rem] font-bold uppercase tracking-wide text-white sm:text-[1.05rem]">
            Seu nome aqui
          </span>
          <span className="shrink-0 text-[0.85rem] font-semibold tracking-[0.18em] text-white/80 sm:text-[0.95rem]">
            •••• 6E5F
          </span>
        </div>
      </div>
    </div>
  );
}