import React from 'react';
import { Wallet } from 'lucide-react';

// 🖤💚 Cabeçalho da Carteira no padrão da Visão Geral: preto da barra puxando
// pro verde escuro da marca, com o TOTAL GERAL em destaque. Só pintura.
export default function CarteiraHeader({ total }) {
  const money = 'R$ ' + (Number(total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 sm:p-8 shadow-lg shadow-black/20"
      style={{ background: 'linear-gradient(135deg, #21222B 0%, #143B27 60%, #0C1F16 100%)' }}
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/10 ring-2 ring-nz-verde-claro/50 shrink-0">
          <Wallet className="w-7 h-7 text-white" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-nz-verde-claro mb-1">Financeiro</p>
          <h1 className="font-slab text-2xl sm:text-3xl font-extrabold leading-tight text-white">Minha Carteira</h1>
        </div>
      </div>
      <div className="mt-5 pt-5 border-t border-white/10">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Total na carteira</p>
        <p className="text-3xl sm:text-4xl font-black text-white tabular-nums mt-1">{money}</p>
        <p className="text-[11px] text-white/50 mt-1">Depósitos + comissões disponíveis</p>
      </div>
    </div>
  );
}