import React from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';

// 📄 Planilhas REAIS de lote hospedadas aqui dentro — o parceiro não precisa ter
// arquivo no computador: toca no lote e o próprio analisador roda em cima dele.
// Nenhum download, nenhum link externo: o arquivo é lido pelo sistema.
export const PLANILHAS_TESTE = [
  {
    id: 'lote253',
    titulo: 'Lote 253 — Franco da Rocha (SP)',
    detalhe: 'Lote completo · 961 itens · Mercado Livre',
    url: '/midia/c69b9b1fd_LOTE253-FCODAROCHA-COMPLETO.xlsx',
  },
  {
    id: 'lote132',
    titulo: 'Lote 132 — Perus (SP)',
    detalhe: 'Lote misto · 725 itens · Mercado Livre',
    url: '/midia/9629284f3_LOTE132-PERUS-COMPLETO.xlsx',
  },
  {
    id: 'lote495',
    titulo: 'Lote 495 — Cajamar (SP)',
    detalhe: 'Lote especialista · 3.553 itens · Mercado Livre',
    url: '/midia/b114f4230_LOTE495-CAJAMAR-ESPECIALISTA.xlsx',
  },
];

export default function ParceiroPlanilhasTeste({ onEscolher, carregandoId }) {
  return (
    <div className="mt-6 space-y-2">
      {PLANILHAS_TESTE.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={!!carregandoId}
          onClick={() => onEscolher(p)}
          className="flex min-h-[56px] w-full items-center gap-3 border border-pc-borda bg-pc-preto-2 px-4 py-3 text-left transition-colors hover:border-pc-ouro disabled:opacity-60"
        >
          {carregandoId === p.id ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-pc-ouro" strokeWidth={1.5} />
          ) : (
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-pc-ouro" strokeWidth={1.5} />
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-pc-tinta">{p.titulo}</span>
            <span className="block text-[11px] uppercase tracking-wide text-pc-tinta-fraca">
              {p.detalhe}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}