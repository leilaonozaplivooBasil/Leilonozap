import React from 'react';
import ParceiroSecao from './ParceiroSecao';
import ParceiroLamina from './ParceiroLamina';
import ParceiroDetalhe from './ParceiroDetalhe';

const IMG_CURADORIA = '/midia/d9f9f805d_generated_image.png';

const PASSOS = [
  'Classificação por curva ABC',
  'Análise de liquidez do item',
  'Cálculo de rentabilidade por lote',
  'Gestão de risco operacional',
];

const PAINEL = [
  'Registro detalhado das operações realizadas',
  'Demonstrativo de resultados das operações comerciais',
  'Valores apurados, pagos e a pagar',
  'Consulta contínua durante toda a vigência',
];

// Bloco 03 — curadoria e transparência (Cláusulas 5, 7 e 10).
export default function ParceiroCuradoria() {
  return (
    <ParceiroSecao numero="03" rotulo="Curadoria e transparência" referencia="Cláusulas 5, 7 e 10">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="text-2xl font-bold leading-tight text-pc-tinta sm:text-4xl">
            Método antes de <span className="text-pc-ouro">volume</span>
          </h2>
          <p className="mt-6 text-sm leading-relaxed text-pc-tinta-fraca sm:text-base">
            Nenhum lote entra na operação por oportunidade isolada. A entrada é decidida por
            metodologia própria, aplicada item a item.
          </p>
          <ul className="mt-8">
            {PASSOS.map((p, i) => (
              <li key={p} className="flex items-center gap-4 border-t border-pc-borda py-4">
                <span className="text-xs tracking-[0.2em] text-pc-ouro">0{i + 1}</span>
                <span className="text-sm text-pc-tinta sm:text-base">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="border border-pc-borda p-6 sm:p-8">
            <p className="text-[10px] uppercase tracking-[0.25em] text-pc-ouro sm:text-xs">
              Painel digital exclusivo
            </p>
            <h3 className="mt-3 text-lg font-bold leading-snug text-pc-tinta sm:text-2xl">
              Prestação de contas em tempo de operação
            </h3>
            <ul className="mt-6">
              {PAINEL.map((item) => (
                <li key={item} className="flex items-start gap-3 border-t border-pc-borda py-4">
                  <span className="mt-2 h-px w-4 flex-shrink-0 bg-pc-ouro" />
                  <span className="text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <ParceiroDetalhe rotulo="Ver obrigação contratual da plataforma">
            <div className="mt-4 border-l-2 border-pc-borda pl-5">
              <p className="text-[10px] uppercase tracking-[0.25em] text-pc-tinta-fraca sm:text-xs">
                Obrigação contratual da plataforma
              </p>
              <p className="mt-3 text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">
                Alocar o capital, executar curadoria e aquisição com critérios técnicos, operar logística
                e comercialização, garantir transparência total pelo painel e efetuar os repasses e a
                devolução do capital nos prazos pactuados.
              </p>
            </div>
          </ParceiroDetalhe>
        </div>
      </div>

      <div className="mt-14">
        <ParceiroLamina
          imagem={IMG_CURADORIA}
          alt="Inspeção técnica de produto na operação"
          selo="Item a item"
          frase="Nenhum lote entra por oportunidade. Entra por método."
        />
      </div>
    </ParceiroSecao>
  );
}