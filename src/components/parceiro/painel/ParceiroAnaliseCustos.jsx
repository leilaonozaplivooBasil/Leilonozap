import React from 'react';

// 💰 Custos do arremate usados na análise — só entram no cálculo da tela.
// Nada é salvo: é uma simulação de leitura.
const CAMPOS = [
  { chave: 'arremate', rotulo: 'Valor do arremate (R$)', passo: '0.01' },
  { chave: 'taxaPct', rotulo: 'Taxa do leilão (%)', passo: '0.1' },
  { chave: 'frete', rotulo: 'Frete (R$)', passo: '1' },
  { chave: 'outros', rotulo: 'Outros custos (R$)', passo: '1' },
];

export default function ParceiroAnaliseCustos({ custos, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {CAMPOS.map((campo) => (
        <label key={campo.chave} className="block">
          <span className="block text-[10px] uppercase tracking-[0.12em] text-pc-tinta-fraca">
            {campo.rotulo}
          </span>
          <input
            type="number"
            step={campo.passo}
            inputMode="decimal"
            value={custos[campo.chave]}
            onChange={(e) => onChange({ ...custos, [campo.chave]: e.target.value })}
            className="mt-1 min-h-[44px] w-full border border-pc-borda bg-pc-preto px-3 text-sm text-pc-tinta outline-none focus:border-pc-ouro"
          />
        </label>
      ))}
    </div>
  );
}