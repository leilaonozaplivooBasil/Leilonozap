import React from 'react';

const STATUS = [
  { v: 'todos', t: 'Todos' },
  { v: 'pago', t: 'Pagos' },
  { v: 'pendente', t: 'Pendentes' },
  { v: 'expirado', t: 'Expirados' },
  { v: 'cancelado', t: 'Cancelados' },
];

const PERIODOS = [
  { v: 'todos', t: 'Todo o período' },
  { v: '7', t: 'Últimos 7 dias' },
  { v: '30', t: 'Últimos 30 dias' },
  { v: '90', t: 'Últimos 90 dias' },
];

export default function AportesFiltros({ status, periodo, onStatus, onPeriodo }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {STATUS.map((s) => (
          <button
            key={s.v}
            type="button"
            onClick={() => onStatus(s.v)}
            className={`min-h-[44px] rounded-lg border px-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
              status === s.v
                ? 'border-pc-ouro bg-pc-ouro/15 text-pc-ouro'
                : 'border-pc-borda bg-pc-preto-2 text-pc-tinta-fraca hover:text-pc-tinta'
            }`}
          >
            {s.t}
          </button>
        ))}
      </div>
      <select
        value={periodo}
        onChange={(e) => onPeriodo(e.target.value)}
        className="min-h-[44px] rounded-lg border border-pc-borda bg-pc-preto-2 px-3 text-sm text-pc-tinta"
      >
        {PERIODOS.map((p) => (
          <option key={p.v} value={p.v}>{p.t}</option>
        ))}
      </select>
    </div>
  );
}