import React from 'react';
import { Check, Loader2, Circle } from 'lucide-react';

// 🔹 Uma etapa da linha do tempo. Estado derivado do dia atual do ciclo.
export default function EtapaLinha({ etapa, diaAtual, ultima }) {
  const concluida = diaAtual >= etapa.dia;
  const emAndamento = !concluida && diaAtual >= etapa.dia - 2;

  const data = etapa.dataPrevista
    ? new Date(etapa.dataPrevista).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : null;

  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {/* trilho */}
      {!ultima && (
        <span
          aria-hidden="true"
          className={`absolute left-[15px] top-8 bottom-0 w-px ${concluida ? 'bg-pc-ouro/60' : 'bg-pc-borda'}`}
        />
      )}

      <span
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center border ${
          concluida
            ? 'border-pc-ouro bg-pc-ouro/15 text-pc-ouro'
            : emAndamento
              ? 'border-pc-ouro/50 bg-pc-preto-2 text-pc-ouro'
              : 'border-pc-borda bg-pc-preto-2 text-pc-tinta-fraca'
        }`}
      >
        {concluida ? (
          <Check className="h-4 w-4" strokeWidth={2.4} />
        ) : emAndamento ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
        ) : (
          <Circle className="h-2.5 w-2.5" strokeWidth={3} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="border border-pc-borda px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-pc-ouro">
            D+{etapa.dia}
          </span>
          {data && <span className="text-[11px] text-pc-tinta-fraca">{data}</span>}
          <span className="text-[10px] uppercase tracking-[0.12em] text-pc-tinta-fraca">{etapa.marco}</span>
          {concluida && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-pc-ouro">Concluído</span>
          )}
          {emAndamento && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-pc-ouro">Em andamento</span>
          )}
        </div>
        <h3
          className={`mt-1.5 text-sm font-bold sm:text-base ${
            etapa.destaque ? 'text-pc-ouro' : 'text-pc-tinta'
          }`}
        >
          {etapa.titulo}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-pc-tinta-fraca">{etapa.texto}</p>
      </div>
    </li>
  );
}