import React from 'react';
import { TrendingUp, Clock } from 'lucide-react';
import useRentabilidadeAcumulada from './useRentabilidadeAcumulada';
import { DIA_INICIO_APURACAO, DIA_PRIMEIRO_REPASSE } from './etapasOperacao';
import CofreOperacao from './CofreOperacao';
import OdometroValor from './OdometroValor';

// 🕒 ACOMPANHAMENTO DO CICLO DE 30 DIAS.
// ⚖️ Mostra o ANDAMENTO DO CICLO (dias) e o repasse PREVISTO no fechamento.
// Não exibe valor acumulando dia a dia: dinheiro subindo sozinho sugere quantia
// já devida e resultado garantido — leitura que a operação não pode dar.
export default function ContadorRentabilidade({ dataAssinatura, aporte, taxaMensalPct = 3 }) {
  const r = useRentabilidadeAcumulada(dataAssinatura, aporte, taxaMensalPct);
  const diaMostrado = Math.min(r.diaAtual, DIA_PRIMEIRO_REPASSE);

  return (
    <div className="border border-pc-ouro/50 bg-pc-preto-2 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-pc-ouro">
          <TrendingUp className="h-4 w-4" strokeWidth={1.8} /> Andamento do ciclo de {DIA_PRIMEIRO_REPASSE} dias
        </p>
        <span className="border border-pc-borda px-2 py-0.5 text-[10px] uppercase tracking-wide text-pc-tinta-fraca">
          {r.iniciou ? 'Rentabilizando' : 'Ciclo físico'}
        </span>
      </div>

      <p className="mt-4 break-words font-mono text-3xl font-black tracking-tight text-pc-tinta sm:text-4xl">
        Dia {diaMostrado}
        <span className="text-pc-tinta-fraca"> de {DIA_PRIMEIRO_REPASSE}</span>
      </p>

      {/* 🏦 Cofre no lugar da barrinha: o mesmo dado (dia do ciclo), com leitura
          de operação viva em vez de uma linha reta. */}
      <div className="mt-4">
        <CofreOperacao
          pct={r.progressoPct}
          diaAtual={diaMostrado}
          estado={r.iniciou ? 'Rentabilizando' : 'Ciclo físico'}
          marcos={[
            {
              rotulo: `D+${DIA_INICIO_APURACAO}`,
              texto: 'produtos na Loja Virtual',
              pct: (DIA_INICIO_APURACAO / DIA_PRIMEIRO_REPASSE) * 100,
            },
            { rotulo: `D+${DIA_PRIMEIRO_REPASSE}`, texto: 'repasse + prestação de contas', pct: 100 },
          ]}
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-pc-tinta-fraca">
        {r.iniciou
          ? `Produtos no ar desde o ${DIA_INICIO_APURACAO}º dia — o capital está rentabilizando na operação.`
          : `A rentabilização começa no ${DIA_INICIO_APURACAO}º dia, quando os produtos entram na Loja Virtual — faltam ${r.diasParaApurar} dias. Até lá o capital está na compra, na logística e na curadoria.`}
      </p>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-pc-borda pt-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-pc-ouro">Repasse previsto no fechamento</p>
          <OdometroValor valor={r.alvo} className="mt-1 block text-xl font-black text-pc-ouro" />
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-pc-tinta-fraca">
          <Clock className="h-3.5 w-3.5 text-pc-ouro" />
          {r.diasParaRepasse > 0
            ? `Faltam ${r.diasParaRepasse} dias para o repasse (${DIA_PRIMEIRO_REPASSE}º dia).`
            : 'Ciclo fechado — repasse e demonstrativo em Prestação de Contas.'}
        </p>
      </div>

      <p className="mt-4 border-t border-pc-borda pt-3 text-[10px] leading-relaxed text-pc-tinta-fraca">
        Valor de referência do ciclo. O repasse efetivo é o APURADO do lote no fechamento, com nota,
        comprovante e extrato anexados. Não constitui valor devido, promessa de repasse nem garantia de
        resultado futuro.
      </p>
    </div>
  );
}