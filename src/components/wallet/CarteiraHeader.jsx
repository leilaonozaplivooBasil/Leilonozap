import React from 'react';
import { Wallet } from 'lucide-react';

// 🖤💚 Cabeçalho da Carteira no padrão da Visão Geral: preto da barra puxando pro
// verde escuro da marca, com o TOTAL GERAL em destaque.
// ⚠️ As cores do texto vão em style (não em classe): o tema claro do painel
// reescreve classes como text-white e o título ficava escuro sobre fundo escuro.
export default function CarteiraHeader({ total }) {
  const money = 'R$ ' + (Number(total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div
      className="nz-escuro relative overflow-hidden rounded-2xl p-6 sm:p-8 shadow-lg shadow-black/20"
      style={{ background: 'linear-gradient(135deg, #21222B 0%, #143B27 60%, #0C1F16 100%)' }}
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/10 ring-2 ring-nz-verde-claro/50 shrink-0">
          <Wallet className="w-7 h-7" style={{ color: '#FFFFFF' }} />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: '#2E9D63' }}>Financeiro</p>
          <h1 className="font-slab text-2xl sm:text-3xl font-extrabold leading-tight" style={{ color: '#FFFFFF' }}>Minha Carteira</h1>
        </div>
      </div>
      <div className="mt-5 pt-5 border-t border-white/10">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.65)' }}>Total na carteira</p>
        <p className="text-3xl sm:text-4xl font-black tabular-nums mt-1" style={{ color: '#FFFFFF' }}>{money}</p>
        <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Depósitos + comissões disponíveis</p>
      </div>
    </div>
  );
}