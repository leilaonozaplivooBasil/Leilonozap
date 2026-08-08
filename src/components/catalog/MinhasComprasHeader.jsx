import React from 'react';
import { ShoppingBag } from 'lucide-react';

// 🖤💚 Cabeçalho de "Minhas Compras" no mesmo padrão do topo da Visão Geral:
// faixa preto → verde da marca, título forte e três números de resumo.
// ⚠️ Cores em style: o tema claro do painel reescreve classes como text-white.
const money = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MinhasComprasHeader({ total, pagos, valorPago }) {
  const resumo = [
    { label: 'Pedidos', valor: String(total) },
    { label: 'Pagos', valor: String(pagos) },
    { label: 'Total pago', valor: money(valorPago) },
  ];

  return (
    <div
      className="nz-escuro relative overflow-hidden rounded-2xl p-6 sm:p-8 shadow-lg shadow-black/20"
      style={{ background: 'linear-gradient(135deg, #21222B 0%, #143B27 60%, #0C1F16 100%)' }}
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/10 ring-2 ring-nz-verde-claro/50 shrink-0">
          <ShoppingBag className="w-7 h-7" style={{ color: '#FFFFFF' }} />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: '#2E9D63' }}>Loja Virtual</p>
          <h1 className="font-slab text-2xl sm:text-3xl font-extrabold leading-tight" style={{ color: '#FFFFFF' }}>Minhas Compras</h1>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-3 gap-3">
        {resumo.map((r) => (
          <div key={r.label}>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>{r.label}</p>
            <p className="text-lg sm:text-2xl font-black tabular-nums mt-0.5" style={{ color: '#FFFFFF' }}>{r.valor}</p>
          </div>
        ))}
      </div>
    </div>
  );
}