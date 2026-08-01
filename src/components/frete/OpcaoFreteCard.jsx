// OpcaoFreteCard — um cartão selecionável de transportadora (logo, nome, prazo, preço).
import React from 'react';
import { Check } from 'lucide-react';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function OpcaoFreteCard({ opcao, selecionada, onSelecionar }) {
  return (
    <button
      type="button"
      onClick={onSelecionar}
      aria-pressed={selecionada}
      className={`w-full min-h-[44px] flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
        selecionada
          ? 'border-emerald-500 bg-emerald-500/10'
          : 'border-white/10 bg-black/30 hover:border-white/25'
      }`}
    >
      <span
        className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center ${
          selecionada ? 'border-emerald-500 bg-emerald-500' : 'border-white/30'
        }`}
      >
        {selecionada && <Check className="w-3 h-3 text-white" />}
      </span>

      {opcao.logo && (
        <img src={opcao.logo} alt={opcao.empresa} className="h-6 w-10 object-contain shrink-0" loading="lazy" />
      )}

      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-white truncate">
          {opcao.empresa} {opcao.nome}
        </span>
        <span className="block text-xs text-gray-400">
          {opcao.prazo ? `chega em até ${opcao.prazo} ${opcao.prazo === 1 ? 'dia útil' : 'dias úteis'}` : 'prazo a confirmar'}
        </span>
      </span>

      <span className="text-sm sm:text-base font-bold text-emerald-400 shrink-0">{brl(opcao.preco)}</span>
    </button>
  );
}