import React from 'react';
import ParceiroSecao from './ParceiroSecao';

const ETAPAS = [
  { quando: 'Dia 0', titulo: 'Aceite e aporte', texto: 'Assinatura do instrumento e transferência do capital. A vigência de doze meses conta do aceite.' },
  { quando: 'Dias 1–15', titulo: 'Teste e colocação', texto: 'Aquisição dos lotes, preparação e entrada nos canais de venda.' },
  { quando: 'Dias 16–60', titulo: 'Giro do capital', texto: 'Quarenta e cinco dias de giro comercial. Primeiro compartilhamento em até sessenta dias.' },
  { quando: 'Mês 3 ao 12', titulo: 'Repasses mensais', texto: 'A cada trinta dias, com retirada opcional. O capital segue alocado em novas operações.' },
  { quando: 'Mês 12 + 30 dias', titulo: 'Encerramento', texto: 'Encerramento automático da parceria. Capital disponível para retirada em até trinta dias.' },
];

// Bloco 06 — ciclo operacional e financeiro (Cláusula 8). Sem valores.
export default function ParceiroCiclo() {
  return (
    <ParceiroSecao numero="05" rotulo="Ciclo operacional" referencia="Cláusula 8">
      <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <h2 className="text-2xl font-bold leading-tight text-pc-tinta sm:text-4xl">
          Doze meses, do aceite à <span className="text-pc-ouro">devolução</span>
        </h2>
        <p className="text-sm leading-relaxed text-pc-tinta-fraca lg:text-right">
          Prazos exatamente como pactuados em contrato.
          <br className="hidden sm:block" /> Nada além, nada implícito.
        </p>
      </div>

      <ol className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
        {ETAPAS.map((e, i) => (
          <li key={e.quando} className={`border-t pt-5 ${i < 3 ? 'border-pc-ouro' : 'border-pc-borda'}`}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro sm:text-xs">{e.quando}</p>
            <h3 className="mt-3 text-base font-bold text-pc-tinta sm:text-lg">{e.titulo}</h3>
            <p className="mt-3 text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">{e.texto}</p>
          </li>
        ))}
      </ol>

      <div className="mt-14 border border-pc-borda p-6 sm:flex sm:gap-8">
        <p className="text-[10px] uppercase tracking-[0.25em] text-pc-ouro sm:w-40 sm:flex-shrink-0 sm:text-xs">
          Ponto de atenção
        </p>
        <p className="mt-3 text-xs leading-relaxed text-pc-tinta-fraca sm:mt-0 sm:text-sm">
          O capital permanece alocado continuamente em novas operações durante a vigência e{' '}
          <strong className="font-semibold text-pc-tinta">não pode ser retirado antecipadamente</strong>,
          ressalvadas as condições de encerramento previstas na Cláusula 8.
        </p>
      </div>
    </ParceiroSecao>
  );
}