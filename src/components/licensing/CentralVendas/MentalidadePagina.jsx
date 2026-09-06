import React, { useState } from 'react';
import { Brain, BarChart3 } from 'lucide-react';
import EncontroMentalidade from '@/components/licensing/CentralVendas/EncontroMentalidade';
import PerformanceEquipe from '@/components/licensing/CentralVendas/PerformanceEquipe';

// 🧠📊 MENTALIDADE — o espaço da segunda e do fluxo, junto d'O Método (dono, 06/09/2026).
// Duas abas, sem nada administrativo:
//   • Encontro — a segunda-feira (apresentação, tópico pela IA, cronômetro, demandas);
//   • Performance — a visão executiva de todo mundo e o painel corporativo de cada um.
// Na segunda abre no Encontro; nos outros dias, na Performance.

const ABAS = [
  { id: 'encontro', rotulo: 'Encontro de segunda', Icone: Brain },
  { id: 'performance', rotulo: 'Performance do time', Icone: BarChart3 },
];

export default function MentalidadePagina({ currentUser, hojeISO, podeConduzir = false, gestao = false, abaInicial = null }) {
  const hoje = hojeISO || new Date().toISOString().slice(0, 10);
  const ehSegunda = new Date(`${hoje}T12:00:00`).getDay() === 1;
  const [aba, setAba] = useState(abaInicial || (ehSegunda ? 'encontro' : 'performance'));
  return (
    <div className="space-y-3 text-white" data-teste="mentalidade" data-aba={aba}>
      <div className="flex gap-1 flex-wrap" role="tablist" data-teste="mentalidade-abas">
        {ABAS.map(({ id, rotulo, Icone }) => (
          <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => setAba(id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold ${aba === id ? 'bg-white text-black' : 'border border-white/15 text-white/60 hover:text-white'}`} data-aba={id}>
            <Icone className="w-3.5 h-3.5" />{rotulo}
          </button>
        ))}
      </div>
      {aba === 'encontro' ? <EncontroMentalidade currentUser={currentUser} hojeISO={hoje} podeConduzir={podeConduzir} /> : <PerformanceEquipe currentUser={currentUser} hojeISO={hoje} gestao={gestao} />}
    </div>
  );
}
