import React from 'react';

// 📊 A faixa de números.
//
// 🔴 Só entra contagem que veio do banco (ver `numerosDaCasa`). O mock trazia
// "+100 mil usuários ativos" e "+10 mil produtos leiloados" como exemplo; os
// valores reais são outra ordem de grandeza e é o real que vai ao ar.
export default function FaixaDeNumeros({ itens = [] }) {
  if (itens.length === 0) return null;

  return (
    <section className="border-y border-white/10 bg-[#07100C] px-5 py-7" data-teste="faixa-numeros">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-10 gap-y-5 sm:justify-between">
        {itens.map((n) => (
          <div key={n.chave} className="min-w-[130px] text-center sm:text-left" data-teste="numero-da-casa">
            <div className="text-[20px] font-semibold leading-none text-nz-verde-claro sm:text-[24px]">{n.valor}</div>
            <div className="mt-1.5 text-[13px] leading-tight text-white/55">{n.rotulo}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
