import React from 'react';
import { Link } from 'react-router-dom';
import { fmtBR } from '@/lib/money';
import { Receipt } from 'lucide-react';

// Estados que a própria função getDigitalWalletHistory já devolve em bid_state.
const RESULTADO = {
  liderando: { texto: 'Reservado', cls: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
  superado: { texto: 'Devolvido', cls: 'text-gray-300 bg-gray-500/15 border-gray-500/30' },
  arrematado: { texto: 'Arrematado', cls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
};

export default function ExtratoLances({ lances }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Receipt className="w-5 h-5 text-emerald-400" />
          Meus últimos lances
        </h2>
        <Link to="/Carteira" className="text-xs font-bold text-emerald-400 hover:text-emerald-300">
          ver extrato completo
        </Link>
      </div>

      {lances.length === 0 ? (
        <div className="rounded-2xl border border-gray-700/60 bg-gray-800/40 p-6 text-center text-sm text-gray-400">
          Nenhum lance registrado ainda.
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-700/60 bg-gray-800/40 divide-y divide-gray-700/50 overflow-hidden">
          {lances.map((l) => {
            const r = RESULTADO[l.bid_state] || RESULTADO.superado;
            return (
              <div key={l.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-semibold truncate">
                    {(l.title || '').replace(/^Lance — /, '')}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {l.date ? new Date(l.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                </div>
                <p className="text-sm font-bold text-gray-100 flex-shrink-0">R$ {fmtBR(l.amount)}</p>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border flex-shrink-0 ${r.cls}`}>
                  {r.texto}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}