import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import {
  brl,
  pctBr,
  vezes,
  PCT_VENDA_SOBRE_MERCADO,
  PCT_COMISSAO_REDE,
  PCT_ESTRUTURA_VENDA,
  PCT_ORCAMENTO_PARCEIROS,
  PCT_IMPOSTO,
  PCT_REPASSE_PARCEIRO_CICLO,
} from '@/lib/lastroOperacao';

// 🧾 MEMORIAL DO CÁLCULO — abre no clique do "Entenda o cálculo".
// Só EXIBE o resumo já calculado (`r`). Nenhuma conta nova aqui, nenhuma escrita.
export default function MemorialCalculoModal({ resumo: r, onFechar }) {
  if (!r) return null;

  const linhas = [
    {
      rotulo: 'Receita da venda',
      nota: `estoque vendido a ${PCT_VENDA_SOBRE_MERCADO}% do valor de mercado`,
      valor: r.receita,
      sinal: '+',
      destaque: true,
    },
    {
      rotulo: 'Compra do estoque (arremate + frete)',
      nota: 'é o capital que entra na operação',
      valor: r.capital,
      sinal: '−',
    },
    {
      rotulo: 'Comissão da força de venda',
      nota: `${pctBr(PCT_COMISSAO_REDE)} da receita`,
      valor: r.comissaoRede,
      sinal: '−',
    },
    {
      rotulo: 'Estrutura de venda e operação',
      nota: `${pctBr(PCT_ESTRUTURA_VENDA)} da receita — equipe, logística, plataforma`,
      valor: r.estruturaVenda,
      sinal: '−',
    },
    {
      rotulo: 'Parceiros de compra',
      nota: `${pctBr(PCT_ORCAMENTO_PARCEIROS)} da receita — daqui sai o seu repasse`,
      valor: r.orcamentoParceiros,
      sinal: '−',
    },
    {
      rotulo: 'Imposto',
      nota: `${pctBr(PCT_IMPOSTO)} da receita — Simples Nacional, PGDAS-D 06/2026`,
      valor: r.imposto,
      sinal: '−',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-6"
      onClick={onFechar}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto border border-pc-ouro/50 bg-pc-preto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho fixo */}
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-pc-borda bg-pc-preto p-4 sm:p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pc-ouro">
              Entenda o cálculo
            </p>
            <h3 className="mt-1 text-lg font-bold text-pc-tinta sm:text-xl">
              Para onde vai cada real do ciclo
            </h3>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-pc-borda text-pc-tinta-fraca hover:text-pc-tinta"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {/* 🧾 A DRE linha a linha */}
          <div className="divide-y divide-pc-borda border border-pc-borda">
            {linhas.map((l) => (
              <div
                key={l.rotulo}
                className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 p-3 sm:p-4"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-bold sm:text-sm ${
                      l.destaque ? 'text-pc-ouro' : 'text-pc-tinta'
                    }`}
                  >
                    {l.rotulo}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-pc-tinta-fraca">{l.nota}</p>
                </div>
                <p
                  className={`shrink-0 text-sm font-bold sm:text-base ${
                    l.destaque ? 'text-pc-ouro' : 'text-pc-tinta'
                  }`}
                >
                  {l.sinal} {brl(l.valor)}
                </p>
              </div>
            ))}

            {/* = LUCRO */}
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 bg-pc-preto-2 p-3 sm:p-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-wide text-pc-ouro sm:text-sm">
                  = Lucro da operação
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-pc-tinta-fraca">
                  margem líquida de {pctBr(r.margemPct)} sobre a receita
                </p>
              </div>
              <p className="shrink-0 text-base font-black text-pc-ouro sm:text-lg">
                {brl(r.lucro)}
              </p>
            </div>
          </div>

          {/* 🔁 Capital de giro + ROI */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="border border-pc-borda bg-pc-preto-2 p-3 sm:p-4">
              <p className="text-[10px] uppercase leading-snug tracking-[0.14em] text-pc-ouro">
                Capital de giro que volta
              </p>
              <p className="mt-1 text-xl font-black text-pc-tinta sm:text-2xl">{brl(r.capital)}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-pc-tinta-fraca">
                O dinheiro da compra não desaparece: ele voltou para a operação dentro do ciclo, com
                o estoque vendido, e é realocado no próximo lote.
              </p>
            </div>
            <div className="border border-pc-ouro/40 bg-pc-preto-2 p-3 sm:p-4">
              <p className="text-[10px] uppercase leading-snug tracking-[0.14em] text-pc-ouro">
                ROI do ciclo
              </p>
              <p className="mt-1 text-xl font-black text-pc-ouro sm:text-2xl">{pctBr(r.roiPct)}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-pc-tinta-fraca">
                {brl(r.lucro)} de lucro dividido por {brl(r.capital)} de capital aportado. Retorno
                sobre o investimento no ciclo.
              </p>
            </div>
          </div>

          {/* 💸 O repasse do parceiro dentro da conta */}
          <div className="mt-5 border border-pc-ouro/45 bg-pc-preto-2 p-3 sm:p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-pc-ouro">
              Seu repasse dentro dessa conta
            </p>
            <p className="mt-1 text-xl font-black text-pc-ouro sm:text-2xl">{brl(r.repasse)}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-pc-tinta-fraca sm:text-xs">
              {pctBr(PCT_REPASSE_PARCEIRO_CICLO)} sobre o capital aportado, por ciclo de 30 dias — a
              mesma regra do contador que você vê no seu ciclo. Ele é pago de dentro da linha de
              parceiros de compra, que neste volume reserva {brl(r.orcamentoParceiros)}.
            </p>
          </div>

          {/* 🛡️ Poder de segurança */}
          <div className="mt-4 border border-pc-borda bg-pc-preto-2 p-3 sm:p-4">
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-pc-ouro">
              <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={1.8} /> Poder de segurança
            </p>
            <ul className="mt-2 space-y-2 text-[11px] leading-relaxed text-pc-tinta sm:text-xs">
              <li>
                <strong className="text-pc-ouro">{vezes(r.coberturaRepasse)} de folga:</strong> a
                reserva de {brl(r.orcamentoParceiros)} cobre {vezes(r.coberturaRepasse)} o repasse
                comprometido de {brl(r.repasse)}.
              </li>
              <li>
                <strong className="text-pc-ouro">{vezes(r.multiploLastro)} de lastro:</strong> o
                capital de {brl(r.capital)} está representado por {brl(r.lastro)} em mercadoria real
                — bem físico, com valor de mercado, não promessa.
              </li>
              <li>
                <strong className="text-pc-ouro">Lucro depois de tudo:</strong> o repasse não sai do
                lucro apertado — ele já está dentro da conta, e ainda restam {brl(r.lucro)} para a
                operação.
              </li>
            </ul>
          </div>

          <p className="mt-4 border-t border-pc-borda pt-3 text-[10px] leading-relaxed text-pc-tinta-fraca">
            Valores de referência/projeção calculados sobre os lotes publicados, com venda a{' '}
            {PCT_VENDA_SOBRE_MERCADO}% do valor de mercado e percentuais operacionais auditados
            (LAUDO MASTER LNZ-2026-005). Não constituem promessa de rentabilidade nem garantia de
            resultado futuro.
          </p>
        </div>
      </div>
    </div>
  );
}