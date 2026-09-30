import React from 'react';
import { Link } from 'react-router-dom';
import { Gavel, ChevronRight } from 'lucide-react';
import { resumoDoSaldoEmLeilao } from '@/lib/saldoEmLeilao';

// 🔒 30/09/2026 — "o cliente tá com 220 na carteira, mas quando vai comprar
// alega que tem só 40". Pela regra dos três estados (08/08), o lance coberto
// fica preso PRA LOJA até o leilão acabar — e nenhuma tela dizia onde. Este
// quadro diz: quanto, em qual leilão, e quando libera. Some quando não há nada.
export default function SaldoEmLeilaoCard({ w }) {
  const r = resumoDoSaldoEmLeilao(w);
  if (!r) return null;
  return (
    <div data-teste="saldo-em-leilao" className="bg-white border border-nz-borda rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-nz-tinta-fraca">Em leilões rolando</p>
          <p className="text-2xl font-black text-nz-verde tabular-nums mt-1">{r.valor}</p>
          <p className="text-[11px] text-nz-tinta-fraca mt-1.5 leading-snug max-w-md">{r.nota}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-nz-verde/10 text-nz-verde"><Gavel className="h-5 w-5" /></span>
      </div>
      {r.itens.length > 0 && (
        <ul className="mt-3 divide-y divide-nz-borda border-t border-nz-borda">
          {r.itens.map((i) => (
            <li key={i.auctionId}>
              <Link to={`/AuctionRoom?id=${encodeURIComponent(i.auctionId)}`} data-teste="saldo-em-leilao-item"
                className="flex items-center gap-3 py-2.5 text-sm hover:bg-nz-verde/5 rounded-lg px-1 -mx-1">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-nz-tinta">{i.titulo}</span>
                  {i.libera && <span className="block text-[11px] text-nz-tinta-fraca">Libera para a loja em {i.libera}</span>}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-nz-tinta">{i.valor}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-nz-tinta-fraca" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
