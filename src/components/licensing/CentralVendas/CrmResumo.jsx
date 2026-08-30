import React from 'react';
import StatInfoTooltip from './StatInfoTooltip';

// 🧭 DIR-24 Fase 3 (30/08/2026) — a FAIXA DE RESUMO do CRM: os 4 números que
// importam, sempre visíveis no topo, antes de qualquer seção. O leitor
// apressado entende o negócio em 5 segundos; o resto vive nas seções abaixo.
export default function CrmResumo({ itens = [] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
      {itens.map(({ chave, rotulo, valor, sub, info, destaque }) => (
        <div
          key={chave}
          className={`rounded-xl border p-3 sm:p-4 ${destaque ? 'bg-nz-verde text-white border-nz-verde' : 'bg-white border-nz-borda'}`}
        >
          <p className={`text-[11px] sm:text-xs mb-1 flex items-center ${destaque ? 'text-white/85' : 'text-nz-tinta-fraca'}`}>
            {rotulo}
            {info && <StatInfoTooltip text={info} />}
          </p>
          <p className={`text-lg sm:text-2xl font-bold leading-tight ${destaque ? 'text-white' : 'text-nz-tinta'}`}>{valor}</p>
          {sub && <p className={`text-[11px] mt-0.5 ${destaque ? 'text-white/75' : 'text-nz-tinta-fraca'}`}>{sub}</p>}
        </div>
      ))}
    </div>
  );
}
