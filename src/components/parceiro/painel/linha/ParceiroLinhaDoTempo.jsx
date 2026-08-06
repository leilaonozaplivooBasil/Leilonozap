import React from 'react';
import { History, Info } from 'lucide-react';
import { real } from '@/lib/operacaoNumeros';
import { ETAPAS, DIAS_CICLO_FISICO, DIA_PRIMEIRO_REPASSE } from './etapasOperacao';
import EtapaLinha from './EtapaLinha';
import ContadorRentabilidade from './ContadorRentabilidade';

const DIA_MS = 24 * 60 * 60 * 1000;

// 🕒 LINHA DO TEMPO DO APORTE — do aceite do contrato ao primeiro repasse.
// Só leitura. Quando o parceiro ainda não tem plano ativo, mostra o MODELO
// DEMONSTRATIVO (mesmas etapas, aporte de exemplo) para ele ver como fica.
export default function ParceiroLinhaDoTempo({ investimento }) {
  const demonstracao = !investimento;
  const aporte = investimento?.amount || 15000;
  const taxa = investimento?.investmentRate || 3;
  // No modo demonstração, posiciona o ciclo no 38º dia: físico concluído e
  // contador de rentabilidade já rodando — é exatamente o que se quer ver.
  const dataAssinatura = investimento?.startDate || new Date(Date.now() - 38 * DIA_MS).toISOString();

  const base = new Date(dataAssinatura).getTime();
  const diaAtual = (Date.now() - base) / DIA_MS;

  const etapas = ETAPAS.map((e) => ({ ...e, dataPrevista: new Date(base + e.dia * DIA_MS).toISOString() }));
  const fisicasConcluidas = etapas.filter((e) => e.dia <= DIAS_CICLO_FISICO && diaAtual >= e.dia).length;
  const totalFisicas = etapas.filter((e) => e.dia <= DIAS_CICLO_FISICO).length;

  return (
    <section>
      <h1 className="flex items-center gap-2 text-xl font-bold text-pc-tinta sm:text-2xl">
        <History className="h-5 w-5 text-pc-ouro" strokeWidth={1.8} />
        Linha do tempo do aporte
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pc-tinta-fraca">
        Todo o ciclo físico — assinatura, pagamento, arremate, logística, curadoria e publicação —
        acontece em até <strong className="text-pc-ouro">{DIAS_CICLO_FISICO} dias</strong>. A apuração da
        rentabilidade começa no 31º dia e o primeiro repasse ocorre no {DIA_PRIMEIRO_REPASSE}º dia.
      </p>

      {demonstracao && (
        <div className="mt-5 flex items-start gap-2 border border-pc-ouro/40 bg-pc-preto-2 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-pc-ouro" />
          <p className="text-xs leading-relaxed text-pc-tinta-fraca">
            <strong className="text-pc-ouro">MODELO DEMONSTRATIVO.</strong> Você ainda não tem plano ativo:
            esta é a simulação de um aporte de {real(aporte)} assinado há 38 dias, para você ver
            exatamente como a sua linha do tempo será acompanhada. Ao contratar, ela passa a usar as
            suas datas reais.
          </p>
        </div>
      )}

      {/* Resumo do ciclo */}
      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { r: 'Aporte', v: real(aporte) },
          { r: 'Assinatura', v: new Date(dataAssinatura).toLocaleDateString('pt-BR') },
          { r: 'Ciclo físico', v: `${fisicasConcluidas}/${totalFisicas} etapas` },
          { r: 'Dia do ciclo', v: `D+${Math.max(0, Math.floor(diaAtual))}` },
        ].map((i) => (
          <div key={i.r} className="border border-pc-borda bg-pc-preto-2 p-3">
            <dt className="text-[10px] uppercase tracking-[0.12em] text-pc-tinta-fraca">{i.r}</dt>
            <dd className="mt-1 text-sm font-bold text-pc-tinta">{i.v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6">
        <ContadorRentabilidade dataAssinatura={dataAssinatura} aporte={aporte} taxaMensalPct={taxa} />
      </div>

      <ol className="mt-8 border border-pc-borda bg-pc-preto-2 p-5 sm:p-6">
        {etapas.map((e, i) => (
          <EtapaLinha key={e.id} etapa={e} diaAtual={diaAtual} ultima={i === etapas.length - 1} />
        ))}
      </ol>

      <p className="mt-4 text-[11px] leading-relaxed text-pc-tinta-fraca">
        Prazos de referência da operação. Leilão, transporte e curadoria podem variar por lote — qualquer
        desvio é registrado nesta linha e explicado na Prestação de Contas.
      </p>
    </section>
  );
}