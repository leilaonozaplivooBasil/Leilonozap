import React from 'react';
import { Minus, Plus } from 'lucide-react';

// 💰 Campo de aporte digitável do plano Private — valor entre valorMin e
// valorMax, em múltiplos de valorPasso. Só UI: quem decide o que fazer com o
// valor é o carrossel (onEscolher).
export default function ParceiroAporteLivre({ valor, min, max, passo, onChange }) {
  const clamp = (v) => Math.min(max, Math.max(min, v));

  const digitar = (texto) => {
    const digitos = (texto || '').replace(/\D/g, '');
    onChange(digitos ? Number(digitos) : 0);
  };

  const brl = (v) => (v || 0).toLocaleString('pt-BR');

  return (
    <div>
      <p className="text-[10px] sm:text-xs uppercase tracking-[0.15em] text-pc-ouro mb-2">
        Capital do aporte
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Diminuir aporte"
          onClick={() => onChange(clamp((valor || min) - passo))}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center border border-pc-borda text-pc-ouro transition-colors hover:border-pc-ouro"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1 border border-pc-borda bg-pc-preto px-2">
          <span className="text-sm text-pc-tinta-fraca">R$</span>
          <input
            type="text"
            inputMode="numeric"
            value={brl(valor)}
            onChange={(e) => digitar(e.target.value)}
            onBlur={() => onChange(clamp(valor || min))}
            className="min-w-0 flex-1 bg-transparent py-2.5 text-base font-bold text-pc-tinta outline-none sm:text-xl"
          />
        </div>
        <button
          type="button"
          aria-label="Aumentar aporte"
          onClick={() => onChange(clamp((valor || min) + passo))}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center border border-pc-borda text-pc-ouro transition-colors hover:border-pc-ouro"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-pc-tinta-fraca">
        Aporte de R$ {brl(min)} a R$ {brl(max)}, em múltiplos de R$ {brl(passo)}.
      </p>
    </div>
  );
}