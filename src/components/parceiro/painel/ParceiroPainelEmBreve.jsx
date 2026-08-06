import React from 'react';
import { Lock, Wrench, BadgeCheck } from 'lucide-react';

// 🚧 Tela ainda sem conteúdo final.
// Dois estados honestos, sem número inventado:
//  • BLOQUEADA (usuário comum sem NDA): cadeado + botão para assinar o termo.
//  • LIBERADA (validador / acesso interno): sem cadeado, sem botão — apenas
//    "em preparação", deixando ler a descrição do painel.
export default function ParceiroPainelEmBreve({ titulo, texto, exigeNda, onIrParaNda, liberado }) {
  const Icone = liberado ? Wrench : Lock;

  return (
    <section className="border border-pc-borda bg-pc-preto-2 p-6 text-center sm:p-12">
      {liberado && (
        <span className="mx-auto mb-5 inline-flex items-center gap-1.5 border border-pc-ouro/50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-pc-ouro">
          <BadgeCheck className="h-3 w-3" strokeWidth={2} />
          Acesso de validação
        </span>
      )}
      <Icone className="mx-auto h-7 w-7 text-pc-ouro" strokeWidth={1.5} />
      <h2 className="mt-4 text-xl font-bold text-pc-tinta sm:text-2xl">{titulo}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-pc-tinta-fraca">{texto}</p>
      {liberado && (
        <p className="mx-auto mt-4 max-w-xl text-xs text-pc-tinta-fraca/70">
          Conteúdo em preparação — esta tela está liberada para visualização interna.
        </p>
      )}
      {!liberado && exigeNda && (
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