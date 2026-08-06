import React from 'react';
import { TrendingUp, Clock } from 'lucide-react';
import useRentabilidadeAcumulada, { JANELA_APURACAO } from './useRentabilidadeAcumulada';
import { DIA_INICIO_APURACAO, DIA_PRIMEIRO_REPASSE } from './etapasOperacao';
import CofreOperacao from './CofreOperacao';
import ValorRepasseHeroi from './ValorRepasseHeroi';
import BarraHistoricoRepasse from './BarraHistoricoRepasse';

// 🕒 ANDAMENTO DO CICLO DE 30 DIAS.
// ⚖️ Duas leituras bem separadas: "Dia X de 30" é TEMPO; o número grande e a
// barra são o REPASSE PREVISTO do ciclo, referência do contrato — nunca valor
// devido, promessa de repasse ou garantia de resultado.
export default function ContadorRentabilidade({ dataAssinatura, aporte, taxaMensalPct = 3, giroDeHoje = 0 }) {
  const r = useRentabilidadeAcumulada(dataAssinatura, aporte, taxaMensalPct);

  // Dia do ciclo — INTEIRO (é dia, não dinheiro: sem casa decimal).
  const diaFrac = dataAssinatura ? (Date.now() - new Date(dataAssinatura).getTime()) / 86400000 : 0;
  const diaContinuo = Math.max(0, Math.min(diaFrac, DIA_PRIMEIRO_REPASSE));
  const diaInteiro = Math.floor(diaContinuo);

  // Cota diária e histórico: dias de giro JÁ FECHADOS + o que caiu hoje.
  const cotaDia = r.alvo / JANELA_APURACAO;
  const diasDeGiro = Math.floor(r.diasApurados);
  const acumulado = Math.min(r.alvo, cotaDia * diasDeGiro + (giroDeHoje || 0));

  const fase = !r.iniciou ? 'Em preparação' : r.diasParaRepasse > 0 ? 'Giro ativo' : 'Em fechamento';

  return (
    <div className="border border-pc-ouro/50 bg-pc-preto-2 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-pc-ouro">
          <TrendingUp className="h-4 w-4" strokeWidth={1.8} /> Andamento do ciclo de {DIA_PRIMEIRO_REPASSE} dias
        </p>
        <span className="border border-pc-borda px-2 py-0.5 text-[10px] uppercase tracking-wide text-pc-tinta-fraca">
          {fase}
        </span>
      </div>

      {/* ⏱️ TEMPO DE CICLO — em segundo plano, pra nunca ser lido como dinheiro */}
      <p className="mt-4 text-[9px] uppercase tracking-[0.14em] text-pc-tinta-fraca">Tempo de ciclo</p>
      <p className="break-words font-mono text-2xl font-black tabular-nums tracking-tight text-pc-tinta sm:text-3xl">
        Dia {diaInteiro}
        <span className="text-pc-tinta-fraca"> de {DIA_PRIMEIRO_REPASSE}</span>
      </p>

      {/* 🏦 Cofre (tempo, água subindo) + 💰 herói do repasse ao lado */}
      <div className="mt-4">
        <CofreOperacao
          pct={r.progressoPct}
          diaAtual={diaInteiro}
          estado={fase}
          hero={
            <ValorRepasseHeroi valor={r.alvo} pct={r.progressoPct} diaRepasse={DIA_PRIMEIRO_REPASSE} />
          }
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

      {/* 📊 Histórico do giro avançando até o repasse previsto */}
      <div className="mt-5">
        <BarraHistoricoRepasse
          acumulado={acumulado}
          previsto={r.alvo}
          cotaDia={cotaDia}
          diasDeGiro={diasDeGiro}
          diaInicio={DIA_INICIO_APURACAO}
          diaRepasse={DIA_PRIMEIRO_REPASSE}
        />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-pc-tinta-fraca">
        {r.iniciou
          ? `Os produtos estão vendendo na Loja Virtual desde o ${DIA_INICIO_APURACAO}º dia.`
          : `O giro começa no ${DIA_INICIO_APURACAO}º dia, quando os produtos entram na Loja Virtual — faltam ${r.diasParaApurar} dias. Até lá o capital está na compra, na logística e na curadoria.`}
      </p>

      <p className="mt-3 flex items-center gap-1.5 border-t border-pc-borda pt-3 text-[11px] text-pc-tinta-fraca">
        <Clock className="h-3.5 w-3.5 shrink-0 text-pc-ouro" />
        {r.diasParaRepasse > 0
          ? `Faltam ${r.diasParaRepasse} dias para o repasse (${DIA_PRIMEIRO_REPASSE}º dia).`
          : 'Ciclo fechado — repasse e demonstrativo em Prestação de Contas.'}
      </p>

      <p className="mt-3 border-t border-pc-borda pt-3 text-[10px] leading-relaxed text-pc-tinta-fraca">
        Valor de referência do ciclo. O repasse efetivo é o APURADO do lote no fechamento, com nota,
        comprovante e extrato anexados. Não constitui valor devido, promessa de repasse nem garantia de
        resultado futuro.
      </p>
    </div>
  );
}