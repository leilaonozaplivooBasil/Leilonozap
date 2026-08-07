import React, { useState } from 'react';
import { Landmark, ChevronDown } from 'lucide-react';
import { HOJE, ESCALA_1M, FONTE_FISCAL, real, pct } from '@/lib/operacaoNumeros';

// 🏛️ TRANSIÇÃO TRIBUTÁRIA — clique para abrir.
// Mostra que a saída do Simples Nacional já está prevista em estudo de
// viabilidade e que a operação segue lucrativa (e com margem MAIOR) no Lucro
// Real. Fonte: operacaoNumeros.js (HOJE / ESCALA_1M / FONTE_FISCAL).
export default function NotaTributariaBotao() {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="mt-3 border border-pc-borda bg-pc-preto-2">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex min-h-[48px] w-full items-center justify-between gap-3 px-3 py-3 text-left sm:px-4"
      >
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-pc-ouro sm:text-xs">
          <Landmark className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          E quando a empresa sair do Simples?
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-pc-ouro transition-transform ${
            aberto ? 'rotate-180' : ''
          }`}
        />
      </button>

      {aberto && (
        <div className="border-t border-pc-borda px-3 pb-4 pt-3 sm:px-4">
          <p className="text-[11px] leading-relaxed text-pc-tinta sm:text-xs">
            Já está previsto — e estudado. Hoje a operação apura pelo{' '}
            <strong className="text-pc-ouro">Simples Nacional</strong>, com alíquota de {pct(7.56)}{' '}
            confirmada em {FONTE_FISCAL.pgdas} ({FONTE_FISCAL.transmitido}). Acima de R$ 4,8 milhões por ano a
            empresa migra obrigatoriamente para o{' '}
            <strong className="text-pc-ouro">Lucro Real</strong>, e o estudo de viabilidade já
            projetou esse cenário com o regime completo: IRPJ com adicional, CSLL, PIS/COFINS
            não-cumulativo e ICMS — todos líquidos, com aproveitamento de crédito das entradas.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="border border-pc-borda bg-pc-preto p-3">
              <p className="text-[10px] uppercase leading-snug tracking-[0.14em] text-pc-tinta-fraca">
                Hoje · Simples Nacional
              </p>
              <p className="mt-1 text-lg font-bold text-pc-tinta sm:text-xl">
                margem {pct(HOJE.margemPct)}
              </p>
              <p className="mt-0.5 text-[11px] text-pc-tinta-fraca">
                lucro de {real(HOJE.lucro)}/mês · ROI {pct(HOJE.roiPct)}
              </p>
            </div>
            <div className="border border-pc-ouro/45 bg-pc-preto p-3">
              <p className="text-[10px] uppercase leading-snug tracking-[0.14em] text-pc-ouro">
                Em escala · Lucro Real
              </p>
              <p className="mt-1 text-lg font-black text-pc-ouro sm:text-xl">
                margem {pct(ESCALA_1M.margemPct)}
              </p>
              <p className="mt-0.5 text-[11px] text-pc-tinta-fraca">
                lucro de {real(ESCALA_1M.lucro)}/mês · ROI {pct(ESCALA_1M.roiPct)}
              </p>
            </div>
          </div>

          <p className="mt-3 border-l-2 border-pc-ouro/60 pl-3 text-[11px] leading-relaxed text-pc-tinta sm:text-xs">
            <strong className="text-pc-ouro">A carga sobe, e a margem também.</strong> No Lucro Real
            a carga tributária vai a {pct(ESCALA_1M.cargaSobreReceitaPct)} da receita, mas a
            diluição da estrutura fixa mais que compensa: a margem líquida passa de{' '}
            {pct(HOJE.margemPct)} para {pct(ESCALA_1M.margemPct)}. A operação não fica lucrativa
            apesar da escala — ela fica <strong className="text-pc-ouro">mais</strong> lucrativa por
            causa dela.
          </p>

          <p className="mt-3 text-[10px] leading-relaxed text-pc-tinta-fraca">
            Apuração conduzida por {FONTE_FISCAL.contadora} ({FONTE_FISCAL.crc}) —{' '}
            {FONTE_FISCAL.empresa}, {FONTE_FISCAL.cnpj}. O enquadramento definitivo no novo ciclo
            será definido com a contabilidade no momento do desenquadramento. Projeções de
            referência.
          </p>
        </div>
      )}
    </div>
  );
}