import React, { useState } from 'react';
import { Gem, ShieldCheck, RefreshCw, Calculator } from 'lucide-react';
import MemorialCalculoModal from './MemorialCalculoModal';
import {
  resumirLastro,
  brl,
  vezes,
  pctBr,
  inteiro,
  PCT_VENDA_SOBRE_MERCADO,
  PCT_REPASSE_PARCEIRO_CICLO,
} from '@/lib/lastroOperacao';

// 🏛️ GERADOR DE RIQUEZA · LASTRO DO DIA — componente PURO (só recebe e soma).
// Mostra, em linguagem direta: com quanto a operação entra, quanto de mercado
// isso carrega, o que volta no fechamento e qual o retorno sobre o capital.
export default function LastroDoDia({ oportunidades = [] }) {
  const [memorial, setMemorial] = useState(false);
  if (!oportunidades.length) return null;
  const r = resumirLastro(oportunidades);

  const metricas = [
    { rotulo: 'Capital de entrada hoje', valor: brl(r.capital), forte: true },
    { rotulo: 'Lotes na disputa', valor: inteiro(r.lotes) },
    { rotulo: 'Itens no total', valor: inteiro(r.itens) },
    {
      rotulo: `Receita projetada (venda a ${PCT_VENDA_SOBRE_MERCADO}%)`,
      valor: brl(r.receita),
    },
    { rotulo: 'Lucro projetado da operação', valor: brl(r.lucro), forte: true },
    {
      rotulo: `Repasse ao parceiro (${PCT_REPASSE_PARCEIRO_CICLO}% do aporte)`,
      valor: brl(r.repasse),
    },
  ];

  return (
    <div className="mt-5 border border-pc-ouro/45 bg-pc-preto-2 p-4 sm:p-6">
      <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-pc-ouro sm:text-[11px]">
        <Gem className="h-4 w-4 shrink-0" strokeWidth={1.8} />
        Gerador de riqueza · Lastro do dia
      </p>

      {/* 🥇 HERÓI — o valor de mercado que a operação disputa hoje */}
      <p className="mt-2 break-words text-3xl font-black leading-none tracking-tight text-pc-ouro sm:text-5xl">
        {brl(r.lastro)}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">
        em valor de mercado na mesa hoje
      </p>

      {/* ✖️ SELO DO MÚLTIPLO — a frase que qualquer pessoa entende de primeira */}
      <div className="mt-4 border border-pc-ouro/50 bg-pc-preto p-3 sm:p-4">
        <p className="text-2xl font-black leading-none text-pc-ouro sm:text-3xl">
          {vezes(r.multiploLastro)}
        </p>
        <p className="mt-1.5 text-xs font-bold leading-snug text-pc-tinta sm:text-sm">
          de lastro por real alocado
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-pc-tinta-fraca">
          Com {brl(r.capital)} a operação compra {brl(r.lastro)} em mercadoria real.
        </p>
      </div>

      {/* 📊 BARRA — a fatia pequena do capital dentro do lastro total */}
      <div className="mt-5">
        <div className="h-3 w-full overflow-hidden rounded-full bg-pc-preto ring-1 ring-inset ring-pc-borda">
          <div
            className="h-full rounded-full bg-pc-ouro"
            style={{ width: `${Math.max(1.5, r.fatiaCapitalPct)}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="text-[10px] uppercase tracking-[0.14em] text-pc-ouro">
            Capital: {brl(r.capital)} ({pctBr(r.fatiaCapitalPct)})
          </span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-pc-tinta-fraca">
            Lastro: {brl(r.lastro)}
          </span>
        </div>
      </div>

      {/* 🔁 CAPITAL DE GIRO DE VOLTA + ROE */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="border border-pc-borda bg-pc-preto p-3 sm:p-4">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-pc-ouro">
            <RefreshCw className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Capital de giro no ciclo
          </p>
          <p className="mt-1 text-xl font-black text-pc-tinta sm:text-2xl">
            {brl(r.capitalDeVolta)}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-pc-tinta-fraca">
            Vendido o estoque, o capital retorna no fechamento e é realocado no próximo lote. A
            máquina gira de novo — e maior.
          </p>
        </div>
        <div className="border border-pc-ouro/40 bg-pc-preto p-3 sm:p-4">
          <p className="text-[10px] uppercase leading-snug tracking-[0.14em] text-pc-ouro">
            ROI do ciclo · retorno sobre o investimento
          </p>
          <p className="mt-1 text-xl font-black text-pc-ouro sm:text-2xl">{pctBr(r.roiPct)}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-pc-tinta-fraca">
            Lucro de {brl(r.lucro)} sobre {brl(r.capital)} de capital aportado, já depois de
            comissões, impostos e repasses.
          </p>
        </div>
      </div>

      {/* 🧾 CLIQUE AQUI E ENTENDA O CÁLCULO — abre a conta linha a linha */}
      <button
        type="button"
        onClick={() => setMemorial(true)}
        className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 border border-pc-ouro bg-pc-ouro/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-pc-ouro transition-colors hover:bg-pc-ouro/20 sm:text-sm"
      >
        <Calculator className="h-4 w-4 shrink-0" strokeWidth={2} />
        Clique aqui e entenda o cálculo
      </button>

      {memorial && <MemorialCalculoModal resumo={r} onFechar={() => setMemorial(false)} />}

      {/* 📋 GRADE DE MÉTRICAS */}
      <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 border-t border-pc-borda pt-4 sm:grid-cols-2 xl:grid-cols-3">
        {metricas.map((m) => (
          <div key={m.rotulo}>
            <p className="text-[10px] uppercase leading-snug tracking-[0.14em] text-pc-tinta-fraca">
              {m.rotulo}
            </p>
            <p
              className={`mt-0.5 break-words text-base font-bold sm:text-lg ${
                m.forte ? 'text-pc-ouro' : 'text-pc-tinta'
              }`}
            >
              {m.valor}
            </p>
          </div>
        ))}
      </div>

      {/* 🛡️ FOLGA DE PAGAMENTO — a comunicação de segurança */}
      <div className="mt-5 flex flex-col gap-2 border border-pc-borda bg-pc-preto p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
        <ShieldCheck className="h-5 w-5 shrink-0 text-pc-ouro" strokeWidth={1.8} />
        <p className="text-[11px] leading-relaxed text-pc-tinta sm:text-xs">
          <strong className="font-bold text-pc-ouro">
            {vezes(r.coberturaRepasse)} de folga de pagamento.
          </strong>{' '}
          A operação lucra {brl(r.lucro)} neste ciclo e o repasse comprometido ao parceiro é de{' '}
          {brl(r.repasse)}.
        </p>
      </div>

      {/* ⚠️ Linha de urgência — o custo de não arrematar */}
      <p className="mt-4 border-l-2 border-pc-ouro/60 pl-3 text-[11px] leading-relaxed text-pc-tinta-fraca sm:text-xs">
        Se estes lotes não forem arrematados, {brl(r.receita)} em receita e {brl(r.lucro)} em lucro
        deixam de ser gerados — para a operação e para toda a força de venda.
      </p>

      <p className="mt-4 border-t border-pc-borda pt-3 text-[10px] leading-relaxed text-pc-tinta-fraca">
        Valores de referência/projeção, com venda a {PCT_VENDA_SOBRE_MERCADO}% do valor de mercado
        conforme plano contratado. Não constituem promessa de rentabilidade nem garantia de
        resultado futuro.
      </p>
    </div>
  );
}