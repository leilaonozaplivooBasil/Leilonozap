import React, { useState } from 'react';
import { Sparkles, ShoppingBag, DollarSign, Users } from 'lucide-react';

// 🧮 Calculadora do Vendedor com DOIS ganhos separados e somados:
// 1) Venda pessoal — 10% sobre o que o próprio vendedor vende.
// 2) Venda dos influenciadores que ele cadastrar — 5% de rebate (sem limite de quantos).
export default function SellerEarningsCalculator() {
  const tickets = [80, 120, 150, 200, 300, 500];

  const [sales, setSales] = useState('');
  const [ticket, setTicket] = useState(150);

  const [influencers, setInfluencers] = useState('');
  const [salesPerInfluencer, setSalesPerInfluencer] = useState('');
  const [influencerTicket, setInfluencerTicket] = useState(150);

  const salesNum = parseInt(sales) || 0;
  const personalEarnings = salesNum * ticket * 0.10;

  const influencersNum = parseInt(influencers) || 0;
  const salesPerInfluencerNum = parseInt(salesPerInfluencer) || 0;
  const influencerSalesTotal = influencersNum * salesPerInfluencerNum * influencerTicket;
  const influencerEarnings = influencerSalesTotal * 0.05;

  const total = personalEarnings + influencerEarnings;
  const hasResult = salesNum > 0 || (influencersNum > 0 && salesPerInfluencerNum > 0);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-300 bg-amber-50 mb-3">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span className="font-semibold text-sm text-amber-600">Simulador de Ganhos</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-nz-tinta">Calcule Quanto Você Pode Ganhar</h2>
        <p className="text-sm text-nz-tinta-fraca mt-1">
          Você ganha com as suas <strong className="text-nz-tinta">vendas pessoais</strong> e com os{' '}
          <strong className="text-nz-tinta">influenciadores que você cadastrar</strong>
        </p>
      </div>

      {/* BLOCO 1 — VENDA PESSOAL (10%) */}
      <div className="rounded-2xl border-2 border-nz-verde/30 bg-white p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg border border-nz-verde/30 bg-nz-verde-fundo">
            <ShoppingBag className="w-5 h-5 text-nz-verde" />
          </div>
          <div>
            <h3 className="font-bold text-nz-tinta">1. Sua venda pessoal</h3>
            <p className="text-xs text-nz-tinta-fraca">Você ganha 10% sobre tudo que vende</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl p-4 border border-nz-borda bg-nz-verde-fundo">
            <p className="text-xs font-bold text-nz-tinta mb-2">Vendas por mês</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                placeholder="0"
                value={sales}
                onChange={(e) => {
                  const v = e.target.value;
                  setSales(v === '' ? '' : String(Math.max(0, parseInt(v) || 0)));
                }}
                className="w-20 text-3xl font-black bg-transparent text-center border-b-2 border-nz-verde/30 focus:border-nz-verde focus:outline-none text-nz-tinta placeholder-gray-300"
              />
              <span className="text-sm font-bold text-nz-tinta">vendas</span>
            </div>
          </div>
          <div className="rounded-xl p-4 border border-nz-borda bg-gray-50">
            <p className="text-xs font-bold text-nz-tinta mb-2">Ticket médio</p>
            <div className="grid grid-cols-3 gap-1.5">
              {tickets.map((t) => (
                <button
                  key={t}
                  onClick={() => setTicket(t)}
                  className={`py-1.5 rounded-lg text-xs font-bold border-2 ${
                    ticket === t ? 'bg-nz-verde text-white border-nz-verde' : 'bg-white text-nz-tinta-fraca border-gray-300'
                  }`}
                >
                  R$ {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        {salesNum > 0 && (
          <p className="text-center text-sm mt-3 text-nz-tinta-fraca">
            Ganho pessoal: <strong className="text-nz-verde">R$ {personalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>/mês
          </p>
        )}
      </div>

      {/* BLOCO 2 — VENDA DOS INFLUENCIADORES (5%) */}
      <div className="rounded-2xl border-2 border-amber-300 bg-white p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg border border-amber-300 bg-amber-50">
            <Users className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-nz-tinta">2. Venda dos seus influenciadores</h3>
            <p className="text-xs text-nz-tinta-fraca">Você ganha 5% em cada venda deles — sem limite de ganhos</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl p-4 border border-nz-borda bg-amber-50">
            <p className="text-xs font-bold text-nz-tinta mb-2">Influenciadores</p>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={influencers}
              onChange={(e) => {
                const v = e.target.value;
                setInfluencers(v === '' ? '' : String(Math.max(0, parseInt(v) || 0)));
              }}
              className="w-full text-3xl font-black bg-transparent text-center border-b-2 border-amber-300 focus:border-amber-500 focus:outline-none text-nz-tinta placeholder-gray-300"
            />
          </div>
          <div className="rounded-xl p-4 border border-nz-borda bg-gray-50">
            <p className="text-xs font-bold text-nz-tinta mb-2">Vendas de cada um / mês</p>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={salesPerInfluencer}
              onChange={(e) => {
                const v = e.target.value;
                setSalesPerInfluencer(v === '' ? '' : String(Math.max(0, parseInt(v) || 0)));
              }}
              className="w-full text-3xl font-black bg-transparent text-center border-b-2 border-gray-300 focus:border-gray-500 focus:outline-none text-nz-tinta placeholder-gray-300"
            />
          </div>
          <div className="rounded-xl p-4 border border-nz-borda bg-gray-50">
            <p className="text-xs font-bold text-nz-tinta mb-2">Ticket médio</p>
            <div className="grid grid-cols-3 gap-1.5">
              {tickets.map((t) => (
                <button
                  key={t}
                  onClick={() => setInfluencerTicket(t)}
                  className={`py-1.5 rounded-lg text-xs font-bold border-2 ${
                    influencerTicket === t ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-nz-tinta-fraca border-gray-300'
                  }`}
                >
                  R$ {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        {influencersNum > 0 && salesPerInfluencerNum > 0 && (
          <p className="text-center text-sm mt-3 text-nz-tinta-fraca">
            {influencersNum} influenciador{influencersNum > 1 ? 'es' : ''} × {salesPerInfluencerNum} vendas × R$ {influencerTicket} — ganho: {' '}
            <strong className="text-amber-600">R$ {influencerEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>/mês
          </p>
        )}
      </div>

      {/* TOTAL */}
      {hasResult && (
        <div className="rounded-2xl border-2 border-nz-verde/50 bg-nz-verde-fundo p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-nz-verde" />
            <p className="text-sm font-bold text-nz-tinta">Total que você ganha por mês:</p>
          </div>
          <div className="text-4xl md:text-5xl font-black text-nz-verde">
            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-nz-tinta-fraca mt-2">
            Venda pessoal (10%) + venda dos seus influenciadores (5%)
          </p>
        </div>
      )}
    </div>
  );
}