import React from 'react';
import ParceiroSecao from './ParceiroSecao';

const E = [
  'Parceria de natureza estritamente comercial, entre partes determinadas',
  'Participação no lucro líquido apurado nas operações de compra e venda',
  'Capital alocado em produto real, em operações sucessivas de giro',
  'Firmada por aceite eletrônico ou assinatura manual — Lei 14.063/2020 e MP 2.200-2/2001',
  'Responsabilidade operacional integral da plataforma',
  'Sigilo recíproco por cinco anos; foro do Rio de Janeiro/RJ',
];

const NAO_E = [
  'Aplicação financeira, investimento ou produto de renda fixa ou variável',
  'Captação de recursos junto ao público',
  'Oferta pública de valores mobiliários — Lei 6.385/1976',
  'Mútuo, empréstimo ou financiamento',
  'Promessa de rendimento, taxa de juros ou remuneração garantida',
  'Sociedade, joint venture ou associação',
  'Relação de consumo, de emprego ou de trabalho subordinado',
];

// Bloco 05 — natureza jurídica da relação (Cláusulas 3 e 13). Seção obrigatória.
export default function ParceiroRelacaoEouNaoE() {
  return (
    <ParceiroSecao numero="04" rotulo="Estrutura jurídica" referencia="Cláusulas 3 e 13" fundo="preto-2">
      <div className="text-center">
        <h2 className="text-2xl font-bold leading-tight text-pc-tinta sm:text-4xl">
          Instrumento particular de <span className="text-pc-ouro">parceria comercial</span>
        </h2>
        <p className="mx-auto mt-6 max-w-3xl text-sm leading-relaxed text-pc-tinta-fraca sm:text-base">
          A formalização se dá por contrato particular firmado diretamente entre as partes, em
          captação privada. Não há intermediário, plataforma de terceiros ou oferta ao público.
        </p>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="border-b border-pc-borda pb-3 text-[10px] uppercase tracking-[0.25em] text-pc-ouro sm:text-xs">
            O que esta relação é
          </p>
          <ul>
            {E.map((item) => (
              <li key={item} className="flex items-start gap-3 border-b border-pc-borda py-4">
                <span className="mt-1 text-xs text-pc-ouro">◆</span>
                <span className="text-xs leading-relaxed text-pc-tinta sm:text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="border-b border-pc-borda pb-3 text-[10px] uppercase tracking-[0.25em] text-pc-tinta-fraca sm:text-xs">
            O que esta relação não é
          </p>
          <ul>
            {NAO_E.map((item) => (
              <li key={item} className="flex items-start gap-3 border-b border-pc-borda py-4">
                <span className="mt-0.5 text-xs text-pc-tinta-fraca">×</span>
                <span className="text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ParceiroSecao>
  );
}