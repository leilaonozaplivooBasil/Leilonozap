import React from 'react';
import { TrendingUp } from 'lucide-react';
import { brl, pctBr, PCT_VENDA_SOBRE_MERCADO } from '@/lib/lastroOperacao';

// 📈 LUCRO ACUMULADO DO MÊS — componente PURO (só exibe o resumo recebido).
// Mostra, sobre TODO o histórico do mês: se a operação arrematar tudo, quanto
// gera de lucro e qual ROI isso representa — e o que se perde se não arrematar.
// O ROI muda a cada lote novo porque a média paga sobre o mercado muda.
export default function LucroAcumuladoMes({ resumo: r }) {
  if (!r) return null;

  return (
    <div className="mt-4 border border-pc-ouro/45 bg-pc-preto p-3 sm:p-4">
      <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-pc-ouro">
        <TrendingUp className="h-4 w-4 shrink-0" strokeWidth={1.8} />
        Se arrematarmos todo o histórico do mês
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase leading-snug tracking-[0.14em] text-pc-tinta-fraca">
            Lucro da operação no mês
          </p>
          <p className="mt-0.5 break-words text-xl font-black text-pc-ouro sm:text-2xl">
            {brl(r.lucro)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase leading-snug tracking-[0.14em] text-pc-tinta-fraca">
            ROI acumulado do mês
          </p>
          <p className="mt-0.5 break-words text-xl font-black text-pc-ouro sm:text-2xl">
            {pctBr(r.roiPct)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase leading-snug tracking-[0.14em] text-pc-tinta-fraca">
            Média paga sobre o mercado
          </p>
          <p className="mt-0.5 break-words text-xl font-black text-pc-tinta sm:text-2xl">
            {pctBr(r.fatiaCapitalPct)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-pc-tinta-fraca sm:text-xs">
        Compramos o mês a uma média de {pctBr(r.fatiaCapitalPct)} do valor de mercado e vendemos a{' '}
        {PCT_VENDA_SOBRE_MERCADO}%. Cada lote novo entra nessa média e move o ROI para cima ou para
        baixo — hoje o acumulado do mês está em {pctBr(r.roiPct)}, com margem líquida de{' '}
        {pctBr(r.margemPct)}.
      </p>

      <p className="mt-2 border-l-2 border-pc-ouro/60 pl-3 text-[11px] leading-relaxed text-pc-tinta-fraca sm:text-xs">
        Se estes lotes não forem arrematados, {brl(r.receita)} em receita e {brl(r.lucro)} em lucro
        simplesmente deixam de existir para a operação e para a força de venda.
      </p>
    </div>
  );
}