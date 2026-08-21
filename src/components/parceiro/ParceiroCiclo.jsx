import React from 'react';
import ParceiroSecao from './ParceiroSecao';
import ParceiroLamina from './ParceiroLamina';
import ParceiroDetalhe from './ParceiroDetalhe';
import ParceiroCicloRoda from './ParceiroCicloRoda';

const IMG_CICLO = '/midia/a5ded50b6_generated_image.png';

const ETAPAS = [
  { quando: 'Dia 0', titulo: 'Aceite e aporte', texto: 'Assinatura do instrumento e transferência do capital. A vigência de doze meses conta do aceite.' },
  { quando: 'Dias 1–15', titulo: 'Teste e colocação', texto: 'Aquisição dos lotes, preparação e entrada nos canais de venda.' },
  { quando: 'Dias 16–30', titulo: 'Giro do capital', texto: 'Quinze dias de giro comercial. Primeiro repasse em até trinta dias.' },
  { quando: 'A partir do 1º repasse', titulo: 'Repasses mensais', texto: '12 meses de repasses, contados a partir do primeiro repasse. A cada trinta dias, com retirada opcional. O capital segue alocado em novas operações.' },
  { quando: 'Mês 12 + 30 dias', titulo: 'Encerramento', texto: 'Encerramento automático da parceria. Capital disponível para retirada em até trinta dias.' },
];

// Bloco 06 — ciclo operacional e financeiro (Cláusula 8). Sem valores.
export default function ParceiroCiclo() {
  return (
    <ParceiroSecao numero="05" rotulo="Ciclo operacional" referencia="Cláusula 8">
      <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <h2 className="text-2xl font-bold leading-tight text-pc-tinta sm:text-4xl">
          12 meses de repasses, mais os <span className="text-pc-ouro">30 dias de estruturação</span>
        </h2>
        <p className="text-sm leading-relaxed text-pc-tinta-fraca lg:text-right">
          Os primeiros 30 dias são de estruturação e não entram na contagem:
          <br className="hidden sm:block" /> os 12 meses de repasses começam no primeiro repasse.
        </p>
      </div>

      {/* As cinco etapas saíram da grade de 5 colunas (densa) e agora giram na
          roda de 12 meses: uma mensagem por vez, no ritmo de quem lê. */}
      <ParceiroCicloRoda etapas={ETAPAS} />

      <div className="mt-14">
        <ParceiroLamina
          imagem={IMG_CICLO}
          alt="Doca de carregamento da operação logística"
          selo="Giro contínuo"
          frase="O capital não fica parado. Ele gira em operações sucessivas."
        />
      </div>

      <ParceiroDetalhe rotulo="Ver ponto de atenção do ciclo">
        <div className="mt-6 border border-pc-borda p-6 sm:flex sm:gap-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-pc-ouro sm:w-40 sm:flex-shrink-0 sm:text-xs">
            Ponto de atenção
          </p>
          <p className="mt-3 text-xs leading-relaxed text-pc-tinta-fraca sm:mt-0 sm:text-sm">
            O capital permanece alocado continuamente em novas operações durante a vigência e{' '}
            <strong className="font-semibold text-pc-tinta">não pode ser retirado antecipadamente</strong>,
            ressalvadas as condições de encerramento previstas na Cláusula 8.
          </p>
        </div>
      </ParceiroDetalhe>
    </ParceiroSecao>
  );
}