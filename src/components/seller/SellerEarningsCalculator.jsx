import React, { useState } from 'react';
import { Sparkles, ShoppingBag, DollarSign } from 'lucide-react';

// 🧮 Calculadora simples do Vendedor: ele vende direto (não é indicação em cascata),
// então o cálculo é vendas próprias x ticket médio x 10% — sem "rede"/"indicados".
export default function SellerEarningsCalculator() {
  const [sales, setSales] = useState('');
  const [ticket, setTicket] = useState(150);

  const tickets = [80, 120, 150, 200, 300, 500];
  const salesNum = parseInt(sales) || 0;
  const total = salesNum * ticket;
  const earnings = total * 0.10;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-300 bg-amber-50 mb-3">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span className="font-semibold text-sm text-amber-600">Simulador de Ganhos</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-nz-tinta">Calcule Quanto Você Pode Ganhar</h2>
        <p className="text-sm text-nz-tinta-fraca mt-1">Vendendo os produtos do seu catálogo como Vendedor</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl p-4 border-2 border-nz-verde/30 bg-nz-verde-fundo">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg border border-nz-verde/30 bg-nz-verde/10">
              <ShoppingBag className="w-5 h-5 text-nz-verde" />
            </div>
            <h3 className="text-base font-bold text-nz-tinta">Vendas por mês</h3>
          </div>
          <div className="flex items-center justify-center gap-2">
            <input
              type="number"
              min="0"
              placeholder="0"
              value={sales}
              onChange={(e) => {
                const v = e.target.value;
                setSales(v === '' ? '' : String(Math.max(0, parseInt(v) || 0)));
              }}
              className="w-24 text-3xl font-black bg-transparent text-center border-b-2 border-nz-verde/30 focus:border-nz-verde focus:outline-none text-nz-tinta placeholder-gray-300"
            />
            <span className="text-sm font-bold text-nz-tinta">vendas</span>
          </div>
        </div>

        <div className="rounded-xl p-4 border-2 border-gray-300 bg-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg border border-gray-300 bg-gray-200">
              <DollarSign className="w-5 h-5 text-gray-600" />
            </div>
            <h3 className="text-base font-bold text-nz-tinta">Ticket médio</h3>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {tickets.map((t) => (
              <button
                key={t}
                onClick={() => setTicket(t)}
                className={`py-1.5 rounded-lg text-xs font-bold border-2 ${
                  ticket === t
                    ? 'bg-nz-verde text-white border-nz-verde'
                    : 'bg-white text-nz-tinta-fraca border-gray-300'
                }`}
              >
                R$ {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {salesNum > 0 && (
        <div className="mt-4 rounded-2xl border-2 border-nz-verde/40 bg-white p-5 text-center">
          <p className="text-xs font-bold text-nz-tinta mb-1">Você ganha por mês:</p>
          <div className="text-4xl font-black text-nz-verde">
            R$ {earnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-nz-tinta-fraca mt-2">
            {salesNum} vendas × R$ {ticket} × 10% de comissão
          </p>
        </div>
      )}
    </div>
  );
}