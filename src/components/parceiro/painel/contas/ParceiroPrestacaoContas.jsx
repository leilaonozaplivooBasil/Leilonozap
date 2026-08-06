import React from 'react';
import { Receipt, FileCheck2, Info, CalendarClock, ShieldAlert } from 'lucide-react';
import { real } from '@/lib/operacaoNumeros';
import ContasDemonstrativo from './ContasDemonstrativo';
import useRentabilidadeAcumulada from '../linha/useRentabilidadeAcumulada';

const DIA_MS = 86400000;

// 🧾 PRESTAÇÃO DE CONTAS (Cláusula 7.4) — o compromisso de transparência da
// operação: o que o parceiro recebe, quando recebe e com qual comprovação.
// Só leitura. Sem plano ativo, mostra o MODELO DEMONSTRATIVO do que ele receberá.
export default function ParceiroPrestacaoContas({ investimento, onIrParaLinha }) {
  const demonstracao = !investimento;
  const aporte = investimento?.amount || 15000;
  const taxa = investimento?.investmentRate || 3;
  const assinatura = investimento?.startDate || new Date(Date.now() - 38 * DIA_MS).toISOString();
  const r = useRentabilidadeAcumulada(assinatura, aporte, taxa);

  const documentos = [
    { t: 'Nota e comprovante do arremate', d: 'Valor pago pelo lote, taxa do leiloeiro e frete da retirada.' },
    { t: 'Conferência de recebimento', d: 'O que veio, o que faltou e o que veio a mais em relação à planilha do leilão.' },
    { t: 'Laudo de curadoria', d: 'Classificação item por item nas grades A a E, com o que virou produto e o que virou peça.' },
    { t: 'Extrato de vendas do lote', d: 'Cada venda com data, canal, preço e comissão paga à rede.' },
    { t: 'Demonstrativo de resultado', d: 'Receita, custos, impostos e resultado apurado do ciclo.' },
    { t: 'Comprovante do repasse', d: 'PIX do repasse com data, valor e identificação do favorecido.' },
  ];

  return (
    <section>
      <h1 className="flex items-center gap-2 text-xl font-bold text-pc-tinta sm:text-2xl">
        <Receipt className="h-5 w-5 text-pc-ouro" strokeWidth={1.8} />
        Prestação de contas
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-pc-tinta-fraca">
        Prestar contas aqui não é mostrar um número bonito — é mostrar de onde ele veio. A cada
        fechamento de ciclo você recebe o resultado apurado do lote comprado com o seu capital, a
        decomposição completa desse resultado e os documentos que provam cada linha. Se o ciclo fechar
        abaixo da referência, você vê isso também: transparência radical é a regra da operação.
      </p>

      {demonstracao && (
        <div className="mt-5 flex items-start gap-2 border border-pc-ouro/40 bg-pc-preto-2 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-pc-ouro" />
          <p className="text-xs leading-relaxed text-pc-tinta-fraca">
            <strong className="text-pc-ouro">MODELO DEMONSTRATIVO.</strong> Simulação de um aporte de{' '}
            {real(aporte)} para você ver exatamente o formato da sua prestação de contas. Com o plano
            ativo, todos os valores passam a ser os apurados do seu ciclo.
          </p>
        </div>
      )}

      {/* Situação do ciclo */}
      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { r: 'Aporte do ciclo', v: real(aporte) },
          { r: 'Apurado até agora', v: real(r.acumulado) },
          { r: 'Previsto no fechamento', v: real(r.alvo) },
          {
            r: 'Próximo repasse',
            v: r.diasParaRepasse > 0 ? `em ${r.diasParaRepasse} dias` : 'disponível',
          },
        ].map((i) => (
          <div key={i.r} className="border border-pc-borda bg-pc-preto-2 p-3">
            <dt className="text-[10px] uppercase tracking-[0.12em] text-pc-tinta-fraca">{i.r}</dt>
            <dd className="mt-1 text-sm font-bold text-pc-tinta">{i.v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6">
        <ContasDemonstrativo aporte={aporte} taxaMensalPct={taxa} />
      </div>

      {/* Documentos do fechamento */}
      <div className="mt-6 border border-pc-borda bg-pc-preto-2">
        <div className="border-b border-pc-borda px-5 py-4">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-pc-ouro">
            <FileCheck2 className="h-4 w-4" strokeWidth={1.8} /> O que acompanha cada fechamento
          </p>
        </div>
        <ul className="divide-y divide-pc-borda">
          {documentos.map((d) => (
            <li key={d.t} className="px-5 py-3">
              <p className="text-sm font-bold text-pc-tinta">{d.t}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-pc-tinta-fraca">{d.d}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Calendário */}
      <div className="mt-6 border border-pc-borda bg-pc-preto-2 p-5">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-pc-ouro">
          <CalendarClock className="h-4 w-4" strokeWidth={1.8} /> Calendário do ciclo
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-pc-tinta-fraca">
          <li>• <strong className="text-pc-tinta">D+0 a D+15</strong> — ciclo físico: compra, logística, curadoria e publicação na Loja Virtual.</li>
          <li>• <strong className="text-pc-tinta">D+31</strong> — início da apuração do repasse, contabilizado dia a dia.</li>
          <li>• <strong className="text-pc-tinta">D+60</strong> — fechamento do ciclo, primeiro repasse e demonstrativo completo (Cláusula 8.2). Deste marco começam os 12 meses de repasses.</li>
          <li>• <strong className="text-pc-tinta">A cada fechamento</strong> — você decide: retirar o resultado ou recompor o capital no ciclo seguinte.</li>
        </ul>
        <button
          type="button"
          onClick={onIrParaLinha}
          className="mt-5 flex min-h-[48px] w-full items-center justify-center border border-pc-ouro px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-pc-ouro transition-colors hover:bg-pc-ouro hover:text-pc-preto"
        >
          Ver a linha do tempo do meu ciclo
        </button>
      </div>

      {/* O que é e o que não é */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="border border-pc-borda bg-pc-preto-2 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pc-ouro">O que esta operação é</p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-pc-tinta-fraca">
            <li>• Parceria comercial sobre compra e revenda de lotes reais.</li>
            <li>• Resultado apurado por ciclo, com nota, extrato e comprovante.</li>
            <li>• Capital rastreável: você sabe qual lote foi comprado com o seu aporte.</li>
          </ul>
        </div>
        <div className="border border-pc-borda bg-pc-preto-2 p-5">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-pc-ouro">
            <ShieldAlert className="h-4 w-4" strokeWidth={1.8} /> O que esta operação não é
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-pc-tinta-fraca">
            <li>• Não é investimento regulado pela CVM nem produto financeiro.</li>
            <li>• Não é renda fixa: não há repasse garantido nem promessa de resultado.</li>
            <li>• Não é participação societária e não remunera por indicação de pessoas.</li>
          </ul>
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-pc-tinta-fraca">
        Resultado passado não constitui promessa nem garantia de resultado futuro. Toda operação
        comercial envolve risco, inclusive o de resultado inferior ao previsto.
      </p>
    </section>
  );
}