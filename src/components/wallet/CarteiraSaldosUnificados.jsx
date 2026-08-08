import React from 'react';

// 💰 Quebra do total em quatro números REAIS, todos vindos do mesmo getMyWallet
// que a carteira já usava: nenhum cálculo novo, nenhuma regra financeira tocada.
const money = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CarteiraSaldosUnificados({ w }) {
  const cartoes = [
    { label: 'Depósitos / Leilão', valor: w?.saldo_disponivel, nota: 'Crédito para dar lances e comprar' },
    { label: 'Comissões de vendas', valor: w?.commission_balance, nota: 'Disponível para sacar ou usar na loja' },
    { label: 'Reservado em lances', valor: w?.saldo_alocado, nota: 'Travado enquanto você é o líder' },
    { label: 'A liberar (suas vendas)', valor: w?.saldo_a_liberar, nota: 'Libera na confirmação (PIX 7d · cartão 14d)' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cartoes.map((c) => (
        <div key={c.label} className="bg-white border border-nz-borda rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-nz-tinta-fraca">{c.label}</p>
          <p className="text-2xl font-black text-nz-verde tabular-nums mt-1">{money(c.valor)}</p>
          <p className="text-[11px] text-nz-tinta-fraca mt-1.5 leading-snug">{c.nota}</p>
        </div>
      ))}
    </div>
  );
}