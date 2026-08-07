import React from 'react';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatBRL, formatDataHora, STATUS_VISUAL } from './aporteUtils';

// Cartão de um aporte — usado no mobile e tablet (no desktop a lista vira tabela).
export default function AporteCard({ aporte, status, divergente, conferindo, onConferir }) {
  const visual = STATUS_VISUAL[status] || STATUS_VISUAL.pendente;

  return (
    <div className={`rounded-xl border p-4 ${divergente ? 'border-red-500/40 bg-red-500/5' : 'border-pc-borda bg-pc-preto-2'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-pc-tinta">{aporte.buyer_name || 'Sem nome'}</p>
          <p className="truncate text-xs text-pc-tinta-fraca">{aporte.buyer_email || '—'}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold tracking-wide ${visual.classe}`}>
          {visual.texto}
        </span>
      </div>

      <p className="mt-3 text-xl font-bold text-pc-ouro">{formatBRL(aporte.total_amount)}</p>
      <p className="text-xs text-pc-tinta-fraca">{aporte.product_title || 'Plano não informado'}</p>

      <div className="mt-3 space-y-1 border-t border-pc-borda pt-3 text-xs text-pc-tinta-fraca">
        <p>Gerado em {formatDataHora(aporte.created_date)}</p>
        <p className="break-all">Mercado Pago: {aporte.mp_payment_id || '—'}</p>
      </div>

      {divergente && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-500/10 p-2 text-xs font-semibold text-red-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Pago no Mercado Pago, mas pendente aqui — confira.
        </p>
      )}

      {aporte.mp_payment_id && status !== 'pago' && (
        <button
          type="button"
          onClick={onConferir}
          disabled={conferindo}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-pc-ouro/40 bg-pc-ouro/10 px-3 text-xs font-bold uppercase tracking-wide text-pc-ouro disabled:opacity-60"
        >
          {conferindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Conferir no Mercado Pago
        </button>
      )}
    </div>
  );
}