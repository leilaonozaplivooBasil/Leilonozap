import React from 'react';
import { Eye } from 'lucide-react';
import { paraISOBrasilia, rotuloDeData } from '@/lib/janelaDoBanner';

// 👁️ "Como fica a fileira em tal dia?" (08/10/2026). O dono escolhe uma data e
// hora; o painel esmaece os banners que NÃO estariam no ar naquele momento.
// Só afeta o painel: nada é gravado e o site continua com o relógio de verdade.
export default function SimuladorDeData({ valor, onChange }) {
  const iso = paraISOBrasilia(valor);
  return (
    <div data-teste="simulador-de-data" className="mt-4 rounded-xl border border-white/10 bg-gray-800/60 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white"><Eye className="w-4 h-4 text-cyan-300" /> Pré-visualizar uma data</span>
        <input
          type="datetime-local"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          data-campo="simulada"
          className="h-8 rounded-md border border-white/10 bg-gray-800 px-2 text-xs text-gray-200 [color-scheme:dark]"
        />
        {valor && (
          <button type="button" onClick={() => onChange('')} className="text-xs font-semibold text-gray-300 hover:text-white underline underline-offset-2">
            Voltar para agora
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-gray-400">
        {iso
          ? `Simulando ${rotuloDeData(iso)} (Brasília). Os banners esmaecidos NÃO estariam no ar nesse momento. Nada é gravado.`
          : 'Escolha um dia e uma hora para ver quais banners estariam no ar. Nada é gravado.'}
      </p>
    </div>
  );
}
