import React, { useState } from 'react';
import { Brain, Trophy } from 'lucide-react';
import EncontroMentalidade from '@/components/licensing/CentralVendas/EncontroMentalidade';
import PerformanceEquipe from '@/components/licensing/CentralVendas/PerformanceEquipe';

// 🧠📊 MENTALIDADE — o espaço da segunda e do fluxo, junto d'O Método (dono, 06/09/2026).
// Duas abas, sem nada administrativo:
//   • Mentalidade de segunda — a reunião (apresentação, tópico pela IA, cronômetro, demandas);
//   • X-Performance — os 8 Hábitos de todo o time em visão executiva e o painel corporativo de cada um.
// Na segunda abre no Encontro; nos outros dias, na Performance.

// dono (06/09/2026): "Mentalidade de segunda" (o cérebro fica) e, ao lado,
// "X-Performance" — a visão executiva de todo o time. O administrativo (o
// X-Game, distribuir tarefa, de cima pra baixo) virou "ADM X-Game" na faixa.
const ABAS = [
  { id: 'encontro', rotulo: 'Mentalidade de segunda', Icone: Brain },
  { id: 'performance', rotulo: 'X-Performance', Icone: Trophy },
];

// `soEu` (07/09): quem tem visão total e escolheu "só o meu" vê a X-Performance só dele.
// 07/09 (2ª limpeza) — "está vazando": o rótulo "Você está vendo: X" repetia,
// solto no canto desta faixa, o que as pílulas "Só o meu / Tudo" já dizem lá
// em cima, na faixa da academia — e o ml-auto jogava o texto pra debaixo do
// professor, longe do controle de verdade. UMA fonte só: as pílulas.
export default function MentalidadePagina({ currentUser, hojeISO, podeConduzir = false, gestao = false, abaInicial = null, soEu = false }) {
  const hoje = hojeISO || new Date().toISOString().slice(0, 10);
  const ehSegunda = new Date(`${hoje}T12:00:00`).getDay() === 1;
  const [aba, setAba] = useState(abaInicial || (ehSegunda ? 'encontro' : 'performance'));
  return (
    <div className="space-y-3 text-white" data-teste="mentalidade" data-aba={aba}>
      {/* 07/09 — a faixa das abas fica grudada no topo ao rolar */}
      <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 flex gap-1 flex-wrap items-center" role="tablist" data-teste="mentalidade-abas" style={{ background: 'rgba(0,2,12,0.86)', backdropFilter: 'blur(8px)' }}>
        {ABAS.map(({ id, rotulo, Icone }) => (
          <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => setAba(id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold ${aba === id ? 'bg-white text-black' : 'border border-white/15 text-white/60 hover:text-white'}`} data-aba={id}>
            <Icone className="w-3.5 h-3.5" />{rotulo}
          </button>
        ))}
      </div>
      {aba === 'encontro' ? <EncontroMentalidade currentUser={currentUser} hojeISO={hoje} podeConduzir={podeConduzir} /> : <PerformanceEquipe currentUser={currentUser} hojeISO={hoje} gestao={gestao} soEu={soEu} />}
    </div>
  );
}
