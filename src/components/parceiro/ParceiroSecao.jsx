import React from 'react';

// Moldura padrão das seções da página do Parceiro de Compra.
// Rótulo em maiúsculas douradas + filete de 1px (padrão do PDF institucional).
export default function ParceiroSecao({ numero, rotulo, referencia, children, fundo = 'preto' }) {
  return (
    <section className={fundo === 'preto-2' ? 'bg-pc-preto-2' : 'bg-pc-preto'}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-2 border-b border-pc-borda pb-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-pc-ouro sm:text-xs">
            {numero} · {rotulo}
          </p>
          {referencia && (
            <p className="text-[10px] uppercase tracking-[0.25em] text-pc-tinta-fraca sm:text-xs">
              {referencia}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}