import React from 'react';
import { Tag } from 'lucide-react';
import { brl, pctBr, vezes } from '@/lib/lastroOperacao';

// 🛒 A COMPRA DA LISTA — o bloco que abre o memorial. É a frase mais forte da
// operação: quanto a lista vale no mercado × quanto foi efetivamente pago por ela.
export default function CompraDaListaCard({ resumo: r }) {
  if (!r) return null;

  return (
    <div className="border border-pc-ouro/50 bg-pc-preto-2 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-pc-ouro">
        <Tag className="h-4 w-4 shrink-0" strokeWidth={1.8} />
        Começa na compra
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="border border-pc-borda bg-pc-preto p-3">
          <p className="text-[10px] uppercase leading-snug tracking-[0.14em] text-pc-tinta-fraca">
            Valor de mercado da lista
          </p>
          <p className="mt-1 break-words text-xl font-black text-pc-tinta sm:text-2xl">
            {brl(r.lastro)}
          </p>
        </div>
        <div className="border border-pc-ouro/40 bg-pc-preto p-3">
          <p className="text-[10px] uppercase leading-snug tracking-[0.14em] text-pc-ouro">
            Valor pago pela lista
          </p>
          <p className="mt-1 break-words text-xl font-black text-pc-ouro sm:text-2xl">
            {brl(r.capital)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-pc-tinta sm:text-sm">
        Uma lista de <strong className="text-pc-tinta">{brl(r.lastro)}</strong> foi comprada por{' '}
        <strong className="text-pc-ouro">{brl(r.capital)}</strong> —{' '}
        <strong className="text-pc-ouro">{pctBr(r.pctPagoDaLista)} do valor de mercado</strong>, ou
        seja {pctBr(r.descontoDaListaPct)} abaixo. É aqui que o lucro nasce:{' '}
        {vezes(r.multiploLastro)} de mercadoria por real pago.
      </p>
    </div>
  );
}