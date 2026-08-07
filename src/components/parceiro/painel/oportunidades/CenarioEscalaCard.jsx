import React from 'react';
import { TrendingUp } from 'lucide-react';
import {
  brl,
  pctBr,
  PCT_ESTRUTURA_VENDA,
  PCT_ESTRUTURA_ESCALA,
} from '@/lib/lastroOperacao';
import { ESCALA_1M, real } from '@/lib/operacaoNumeros';

// 📉 POR QUE A ESTRUTURA CAI DE 20% PARA 5%
// A estrutura é custo FIXO em valor absoluto (R$ 48.000/mês hoje · R$ 55.000/mês
// no cenário de R$ 1M — fonte: operacaoNumeros.js). Hoje ela pesa 20% da receita
// porque o volume ainda é pequeno. Com o volume em escala, o MESMO custo passa a
// representar ~5%. O lucro não vem de cortar custo: vem de diluir.
export default function CenarioEscalaCard({ resumo: r }) {
  if (!r) return null;

  return (
    <div className="border border-pc-borda bg-pc-preto-2 p-3 sm:p-4">
      <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-pc-ouro">
        <TrendingUp className="h-4 w-4 shrink-0" strokeWidth={1.8} />
        Por que a estrutura hoje é {pctBr(PCT_ESTRUTURA_VENDA)}
      </p>

      <p className="mt-2 text-[11px] leading-relaxed text-pc-tinta sm:text-xs">
        A estrutura é um custo <strong className="text-pc-ouro">fixo</strong>: equipe, logística e
        plataforma custam o mesmo vendendo {real(59538)} ou {real(ESCALA_1M.receita)} por mês. Hoje
        ela representa {pctBr(PCT_ESTRUTURA_VENDA)} da receita porque o volume ainda é pequeno. Com o
        volume em escala, o mesmo custo cai para cerca de{' '}
        <strong className="text-pc-ouro">{pctBr(PCT_ESTRUTURA_ESCALA)}</strong> — sem contratar nada
        a mais.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="border border-pc-borda bg-pc-preto p-3">
          <p className="text-[10px] uppercase leading-snug tracking-[0.14em] text-pc-tinta-fraca">
            Hoje · estrutura {pctBr(PCT_ESTRUTURA_VENDA)}
          </p>
          <p className="mt-1 text-lg font-bold text-pc-tinta sm:text-xl">{brl(r.lucro)}</p>
          <p className="mt-0.5 text-[11px] text-pc-tinta-fraca">
            margem {pctBr(r.margemPct)} · ROI {pctBr(r.roiPct)}
          </p>
        </div>
        <div className="border border-pc-ouro/45 bg-pc-preto p-3">
          <p className="text-[10px] uppercase leading-snug tracking-[0.14em] text-pc-ouro">
            Em escala · estrutura {pctBr(PCT_ESTRUTURA_ESCALA)}
          </p>
          <p className="mt-1 text-lg font-black text-pc-ouro sm:text-xl">{brl(r.lucroEscala)}</p>
          <p className="mt-0.5 text-[11px] text-pc-tinta-fraca">
            margem {pctBr(r.margemEscalaPct)} · ROI {pctBr(r.roiEscalaPct)}
          </p>
        </div>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-pc-tinta-fraca">
        Mesmo lote, mesma compra, mesma comissão. A única variável é a diluição da estrutura fixa
        pelo volume. Projeção de referência.
      </p>
    </div>
  );
}