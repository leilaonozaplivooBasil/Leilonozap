import React from 'react';
import ParceiroSecao from './ParceiroSecao';

const INDICADORES = [
  { rotulo: 'Crescimento em 4 meses', valor: '+1.000%', destaque: true },
  { rotulo: 'Linhas de código proprietário', valor: '178.000' },
  { rotulo: 'Vigência de cada parceria', valor: '12', sufixo: 'meses' },
];

// Bloco 02 — a tese: ineficiência estrutural operada com método.
export default function ParceiroTracao() {
  return (
    <ParceiroSecao numero="01" rotulo="Resumo executivo" referencia="Leilão NoZap">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="text-2xl font-bold leading-tight text-pc-tinta sm:text-4xl">
            Uma ineficiência estrutural, operada com <span className="text-pc-ouro">método</span>.
          </h2>
          <div className="mt-8 space-y-5 text-sm leading-relaxed text-pc-tinta-fraca sm:text-base">
            <p>
              O e-commerce brasileiro gera diariamente um volume massivo de produtos devolvidos
              dentro do prazo legal de sete dias, estoques de fábrica, mostruários e lotes parados.
              Esse estoque tem valor real e liquidez — falta a ele estrutura de escoamento.
            </p>
            <p>
              A Leilão NoZap opera exatamente esse elo: adquire, faz curadoria técnica e comercializa
              por equipe de vendas própria e canais digitais próprios, sustentada por tecnologia
              proprietária com IA integrada.
            </p>
          </div>
          <blockquote className="mt-8 border-l-2 border-pc-ouro pl-5 text-sm leading-relaxed text-pc-tinta sm:text-base">
            O parceiro não compra uma expectativa de mercado. Ele participa de uma operação já
            validada — com estrutura, equipe e tecnologia pagas.
          </blockquote>
        </div>

        <div>
          <p className="mb-5 text-[10px] uppercase tracking-[0.25em] text-pc-tinta-fraca sm:text-xs">
            Tração operacional
          </p>
          <dl>
            {INDICADORES.map((item) => (
              <div
                key={item.rotulo}
                className="flex items-end justify-between gap-4 border-t border-pc-borda py-6"
              >
                <dt className="max-w-[45%] text-[10px] uppercase leading-relaxed tracking-[0.2em] text-pc-tinta-fraca sm:text-xs">
                  {item.rotulo}
                </dt>
                <dd
                  className={`text-3xl font-bold sm:text-5xl ${item.destaque ? 'text-pc-ouro' : 'text-pc-tinta'}`}
                >
                  {item.valor}
                  {item.sufixo && <span className="ml-1 text-base font-normal sm:text-xl">{item.sufixo}</span>}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 border-t border-pc-borda pt-5 text-xs leading-relaxed text-pc-tinta-fraca">
            Indicadores operacionais históricos da empresa. Não constituem projeção de resultado
            da parceria nem compromisso contratual.
          </p>
        </div>
      </div>
    </ParceiroSecao>
  );
}