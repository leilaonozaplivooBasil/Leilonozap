import React from 'react';
import { fmtBR } from '@/lib/money';
import { Wallet, Lock, Trophy } from 'lucide-react';

const CARTOES = [
  { chave: 'disponivel', label: 'Saldo livre', sub: 'Pronto pra dar lance', Icon: Wallet, cor: 'text-emerald-400', borda: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  { chave: 'alocado', label: 'Reservado em disputa', sub: 'Preso no lance que lidera', Icon: Lock, cor: 'text-amber-400', borda: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  { chave: 'ganhos', label: 'Arremates ganhos', sub: 'Produtos conquistados', Icon: Trophy, cor: 'text-yellow-400', borda: 'border-yellow-500/30', bg: 'bg-yellow-500/10', contador: true },
];

export default function ResumoCards({ saldo, totalGanhos }) {
  const valores = { disponivel: saldo.disponivel, alocado: saldo.alocado, ganhos: totalGanhos };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {CARTOES.map(({ chave, label, sub, Icon, cor, borda, bg, contador }) => (
        <div key={chave} className={`rounded-2xl border ${borda} bg-gray-800/60 backdrop-blur-sm p-4 sm:p-5`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${cor} flex-shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold leading-tight">{label}</p>
          </div>
          <p className={`text-2xl sm:text-3xl font-black ${cor} break-words`}>
            {contador ? valores[chave] : `R$ ${fmtBR(valores[chave])}`}
          </p>
          <p className="text-xs text-gray-500 mt-1">{sub}</p>
        </div>
      ))}
    </div>
  );
}