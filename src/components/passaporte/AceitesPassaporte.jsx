import React from 'react';

export const ACEITES_PASSAPORTE = [
  'Li e compreendi os Termos e Condições do Passaporte de Lances.',
  'Concordo que o valor pago é IRRESTORNÁVEL após a confirmação do pagamento.',
  'Compreendo que o saldo é crédito de uso exclusivo dentro do ecossistema Leilão NoZap.',
  'Reconheço o bônus de 10% para usar na Loja Virtual, além dos descontos da própria loja, e que ele é recolhido caso eu arremate.',
];

export default function AceitesPassaporte({ checks, onToggle }) {
  return (
    <div className="space-y-2">
      {ACEITES_PASSAPORTE.map((txt, i) => (
        <label
          key={i}
          className="flex items-start gap-3 rounded-xl border border-white/12 bg-white/[0.03] p-3.5 cursor-pointer min-h-[44px] hover:border-white/25 transition-colors"
        >
          <input
            type="checkbox"
            checked={Boolean(checks[i])}
            onChange={() => onToggle(i)}
            className="mt-0.5 w-5 h-5 accent-emerald-500 shrink-0"
          />
          <span className="text-xs text-white/70 leading-relaxed">{txt}</span>
        </label>
      ))}
    </div>
  );
}