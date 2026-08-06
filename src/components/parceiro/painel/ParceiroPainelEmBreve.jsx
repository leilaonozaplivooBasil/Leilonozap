import React from 'react';
import { Lock } from 'lucide-react';

// 🚧 Tela ainda não liberada — ou porque depende do NDA, ou porque entra numa
// fase seguinte da construção. Estado honesto: nada de número inventado.
export default function ParceiroPainelEmBreve({ titulo, texto, exigeNda, onIrParaNda }) {
  return (
    <section className="border border-pc-borda bg-pc-preto-2 p-6 text-center sm:p-12">
      <Lock className="mx-auto h-7 w-7 text-pc-ouro" strokeWidth={1.5} />
      <h2 className="mt-4 text-xl font-bold text-pc-tinta sm:text-2xl">{titulo}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-pc-tinta-fraca">{texto}</p>
      {exigeNda && (
        <button
          type="button"
          onClick={onIrParaNda}
          className="mx-auto mt-6 flex min-h-[48px] items-center justify-center border border-pc-ouro px-6 text-[11px] font-semibold uppercase tracking-[0.15em] text-pc-ouro transition-colors hover:bg-pc-ouro hover:text-pc-preto"
        >
          Assinar o termo de confidencialidade
        </button>
      )}
    </section>
  );
}