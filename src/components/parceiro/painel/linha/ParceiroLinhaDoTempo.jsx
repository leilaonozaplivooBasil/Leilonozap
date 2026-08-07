import React from 'react';
import { History, Info } from 'lucide-react';
import { real } from '@/lib/operacaoNumeros';
import { ETAPAS, DIAS_CICLO_FISICO, DIA_PRIMEIRO_REPASSE } from './etapasOperacao';
import RoadmapAscendente from './RoadmapAscendente';
import ContadorRentabilidade from './ContadorRentabilidade';
import QuadroGiroRede from './QuadroGiroRede';
import {
  useAncoraDemonstracao,
  useRelogioDoCiclo,
  diaDoCiclo,
} from '@/lib/ancoraDemonstracaoParceiro';

const DIA_MS = 24 * 60 * 60 * 1000;

// 🕒 LINHA DO TEMPO DO APORTE — do aceite do contrato ao primeiro repasse.
// Só leitura. Quando o parceiro ainda não tem plano ativo, mostra o MODELO
// DEMONSTRATIVO (mesmas etapas, aporte de exemplo) para ele ver como fica.
export default function ParceiroLinhaDoTempo({ investimento }) {
  const demonstracao = !investimento;
  // 📊 Giro de HOJE elevado pelo quadro, pra a barra do histórico somar junto
  const [giroDeHoje, setGiroDeHoje] = React.useState(0);
  const aporte = investimento?.amount || 15000;
  const taxa = investimento?.investmentRate || 3;
  // 🎬 MODO DEMONSTRAÇÃO: conta como se o depósito tivesse entrado no dia em que
  // a pessoa abriu a tela pela primeira vez — e ANDA a partir dali (D+1, D+2 ...
  // D+30), igual ao aporte real. A âncora fica na conta (não no aparelho).
  // Antes era "agora menos 18 dias", recalculado a cada abertura: travava em D+18.
  const ancoraDemo = useAncoraDemonstracao(demonstracao);
  // ⏱️ Relógio próprio: garante a virada do dia sem recarregar a página
  // (e revalida ao voltar do segundo plano no celular).
  const agora = useRelogioDoCiclo();
  const dataAssinatura = investimento?.startDate || ancoraDemo;

  const base = new Date(dataAssinatura).getTime();
  const diaAtual = diaDoCiclo(dataAssinatura, agora);

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
        A operação inteira é de <strong className="text-pc-ouro">{DIA_PRIMEIRO_REPASSE} dias</strong>. O
        lote é pago no mesmo dia da assinatura, retirado entre o 3º e o 7º dia e os produtos entram na
        Loja Virtual em até <strong className="text-pc-ouro">{DIAS_CICLO_FISICO} dias</strong> — é aí que
        o seu capital começa a rentabilizar. No{' '}
        <strong className="text-pc-ouro">{DIA_PRIMEIRO_REPASSE}º dia</strong> o repasse é pago com a
        prestação de contas do ciclo. Deste primeiro repasse começam a contar os{' '}
        <strong className="text-pc-ouro">12 meses</strong> do contrato.
      </p>

      {demonstracao && (
        <div className="mt-5 flex items-start gap-2 border border-pc-ouro/40 bg-pc-preto-2 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-pc-ouro" />
          <p className="text-xs leading-relaxed text-pc-tinta-fraca">
            <strong className="text-pc-ouro">MODELO DEMONSTRATIVO.</strong> Você ainda não tem plano ativo:
            esta é a simulação de um aporte de {real(aporte)} como se o depósito tivesse entrado no dia
            em que você abriu esta tela. A contagem avança sozinha, um dia por dia, até o repasse do{' '}
            {DIA_PRIMEIRO_REPASSE}º dia — exatamente como vai acontecer com o seu aporte. Ao contratar,
            ela passa a contar da data real do seu depósito.
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
        <ContadorRentabilidade
          dataAssinatura={dataAssinatura}
          aporte={aporte}
          taxaMensalPct={taxa}
          giroDeHoje={giroDeHoje}
        />
      </div>

      {/* 🛒 Giro da rede — quadro de destaque, largura cheia. Demonstrativo:
          o repasse é o previsto no contrato e é pago no fechamento. */}
      <QuadroGiroRede
        seed={investimento?.id || 'demonstracao'}
        diaAtual={Math.max(0, Math.floor(diaAtual))}
        alvo={aporte * (taxa / 100)}
        onGiroDoDia={setGiroDeHoje}
      />

      {/* 🚀 Roadmap ascendente: D+0 na base, primeiro repasse no topo */}
      <RoadmapAscendente etapas={etapas} diaAtual={diaAtual} />

      <p className="mt-4 text-[11px] leading-relaxed text-pc-tinta-fraca">
        Prazos de referência da operação. Leilão, transporte e curadoria podem variar por lote — qualquer
        desvio é registrado nesta linha e explicado na Prestação de Contas.
      </p>
    </section>
  );
}