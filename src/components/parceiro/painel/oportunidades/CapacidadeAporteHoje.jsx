import React from 'react';
import { TrendingUp } from 'lucide-react';

const brl = (v) => `R$ ${Math.round(v || 0).toLocaleString('pt-BR')}`;

// 💰 Somador da capacidade de aporte do dia — componente PURO: recebe as
// oportunidades já carregadas na tela e só soma. Nenhuma consulta, nenhuma
// escrita. Valores de referência para o parceiro medir o volume do dia.
export default function CapacidadeAporteHoje({ oportunidades = [] }) {
  if (!oportunidades.length) return null;

  const capacidade = oportunidades.reduce((s, o) => s + (o.valorMercado || 0), 0);
  const entrada = oportunidades.reduce(
    (s, o) => s + (o.lanceEntrada || 0) + (o.freteOportunidade || 0),
    0
  );
  const itens = oportunidades.reduce((s, o) => s + (o.quantidade || 0), 0);

  const apoio = [
    { rotulo: 'Lotes disponíveis', valor: oportunidades.length.toLocaleString('pt-BR') },
    { rotulo: 'Capital de entrada', valor: brl(entrada) },
    { rotulo: 'Itens no total', valor: itens.toLocaleString('pt-BR') },
  ];

  return (
    <div className="mt-5 border border-pc-borda bg-pc-preto-2 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-pc-ouro" strokeWidth={2} />
        <p className="text-[10px] uppercase tracking-[0.18em] text-pc-ouro sm:text-xs">
          Capacidade de aporte hoje
        </p>
      </div>
      <p className="mt-1 text-2xl font-bold leading-tight text-pc-ouro sm:text-4xl">
        {brl(capacidade)}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 border-t border-pc-borda pt-4 sm:grid-cols-3">
        {apoio.map((a) => (
          <div key={a.rotulo}>
            <p className="text-[10px] uppercase tracking-[0.15em] text-pc-tinta-fraca">{a.rotulo}</p>
            <p className="mt-0.5 text-base font-bold text-pc-tinta sm:text-lg">{a.valor}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-pc-tinta-fraca">
        Soma dos lotes publicados para os leilões de hoje. Valores de referência — o aporte é
        definido no plano contratado.
      </p>
    </div>
  );
}