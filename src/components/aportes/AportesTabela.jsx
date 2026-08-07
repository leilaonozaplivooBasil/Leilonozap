import React from 'react';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatBRL, formatDataHora, STATUS_VISUAL } from './aporteUtils';

// Tabela completa — só no desktop (lg+). No mobile/tablet a lista usa AporteCard.
export default function AportesTabela({ aportes, statusDe, divergenteDe, conferindoId, onConferir }) {
  return (
    <div className="overflow-hidden rounded-xl border border-pc-borda">
      <table className="w-full text-sm">
        <thead className="bg-pc-preto-2 text-[11px] uppercase tracking-wide text-pc-tinta-fraca">
          <tr>
            <th className="px-4 py-3 text-left">Parceiro</th>
            <th className="px-4 py-3 text-left">Plano</th>
            <th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Gerado em</th>
            <th className="px-4 py-3 text-left">ID Mercado Pago</th>
            <th className="px-4 py-3 text-right">Conciliar</th>
          </tr>
        </thead>
        <tbody>
          {aportes.map((a) => {
            const status = statusDe(a);
            const visual = STATUS_VISUAL[status] || STATUS_VISUAL.pendente;
            const divergente = divergenteDe(a);
            return (
              <tr key={a.id} className={`border-t border-pc-borda ${divergente ? 'bg-red-500/5' : ''}`}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-pc-tinta">{a.buyer_name || 'Sem nome'}</p>
                  <p className="text-xs text-pc-tinta-fraca">{a.buyer_email || '—'}</p>
                </td>
                <td className="px-4 py-3 text-pc-tinta-fraca">{a.product_title || '—'}</td>
                <td className="px-4 py-3 text-right font-bold text-pc-ouro">{formatBRL(a.total_amount)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${visual.classe}`}>{visual.texto}</span>
                  {divergente && (
                    <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-red-400">
                      <AlertTriangle className="h-3 w-3" /> DIVERGENTE
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-pc-tinta-fraca">{formatDataHora(a.created_date)}</td>
                <td className="px-4 py-3 text-xs text-pc-tinta-fraca">{a.mp_payment_id || '—'}</td>
                <td className="px-4 py-3 text-right">
                  {a.mp_payment_id && status !== 'pago' ? (
                    <button
                      type="button"
                      onClick={() => onConferir(a)}
                      disabled={conferindoId === a.id}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-pc-ouro/40 bg-pc-ouro/10 px-3 text-[11px] font-bold uppercase text-pc-ouro disabled:opacity-60"
                    >
                      {conferindoId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      Conferir
                    </button>
                  ) : (
                    <span className="text-xs text-pc-tinta-fraca">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}