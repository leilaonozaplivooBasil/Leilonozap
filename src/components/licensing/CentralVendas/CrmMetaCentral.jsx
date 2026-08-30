import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Rocket, Store, Globe } from 'lucide-react';
import StatInfoTooltip from './StatInfoTooltip';
import { ALVO_META_CENTRAL } from '@/lib/metaCentral';

// 🚀 DIR-23 (30/08/2026) — META CENTRAL DE VENDAS: R$ 5.000.000/mês
// (R$ 4M online + R$ 1M física), alvo março/2027 — números oficiais do
// RESUMO EXECUTIVO INTEGRADO do dono. O trilho online é dado REAL do mês
// (Loja + Leilão, critério dinheiroReal); o trilho física ainda não tem
// fonte no sistema e aparece marcado como tal — o gap contra a meta é
// mostrado de verdade, sem maquiagem. Regra: src/lib/metaCentral.js.
const fmtBRL = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v) => `${(v || 0).toFixed(1).replace('.', ',')}%`;

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function Trilho({ icone: Icone, titulo, valor, meta, semFonte, detalhe }) {
  const pct = semFonte ? 0 : Math.min(100, (valor / meta) * 100);
  return (
    <div className="rounded-lg border border-nz-borda bg-nz-cinza-fundo p-3">
      <p className="text-xs text-nz-tinta-fraca mb-1 flex items-center gap-1.5">
        <Icone className="w-3.5 h-3.5" /> {titulo} — meta {fmtBRL(meta)}
      </p>
      {semFonte ? (
        <>
          <p className="text-lg font-bold text-nz-tinta-fraca">sem fonte de dado</p>
          <p className="text-[11px] text-nz-tinta-fraca leading-tight">{detalhe}</p>
        </>
      ) : (
        <>
          <div className="flex items-end justify-between mb-1">
            <span className="text-lg font-bold text-nz-tinta">{fmtBRL(valor)}</span>
            <span className="text-[11px] text-nz-tinta-fraca">{fmtPct((valor / meta) * 100)}</span>
          </div>
          <div className="h-2 rounded-full bg-white border border-nz-borda overflow-hidden mb-1">
            <div className="h-full bg-nz-verde rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] text-nz-tinta-fraca leading-tight">{detalhe}</p>
        </>
      )}
    </div>
  );
}

export default function CrmMetaCentral({ metaCentral }) {
  const pct = Math.min(100, metaCentral.pctTotal);
  const agora = new Date();
  const mesLabel = `${MESES[agora.getMonth()]}/${agora.getFullYear()}`;
  return (
    <Card className="bg-white border-nz-borda mb-4 sm:mb-6">
      <CardContent className="p-4 sm:p-5">
        <p className="text-sm font-semibold text-nz-tinta mb-1 flex items-center gap-2">
          <Rocket className="w-4 h-4 text-nz-verde" />
          Meta Central — R$ 5.000.000/mês em vendas (alvo {ALVO_META_CENTRAL})
          <StatInfoTooltip text={`Meta oficial do Resumo Executivo: R$ 5 milhões/mês em vendas até ${ALVO_META_CENTRAL} — R$ 4M no online (Loja Virtual + Leilões) e R$ 1M na operação física. Só entra venda de mercadoria REAL do mês corrente (paga + confirmada + a partir de 01/08). Não confundir com a meta de CAPTAÇÃO de R$ 1M (aportes e adesões), que é outro painel.`} />
        </p>
        <p className="text-xs text-nz-tinta-fraca mb-2">Mês de referência: {mesLabel}</p>

        <div className="mb-1 flex items-end justify-between">
          <span className="text-2xl font-bold text-nz-verde">{fmtBRL(metaCentral.total)}</span>
          <span className="text-xs text-nz-tinta-fraca">faltam {fmtBRL(metaCentral.faltamTotal)} · {fmtPct(metaCentral.pctTotal)} da meta</span>
        </div>
        <div className="h-3 rounded-full bg-nz-cinza-fundo border border-nz-borda overflow-hidden mb-4">
          <div className="h-full bg-nz-verde rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Trilho
            icone={Globe}
            titulo="Online (Loja Virtual + Leilões)"
            valor={metaCentral.online}
            meta={metaCentral.metaOnline}
            detalhe={`Loja ${fmtBRL(metaCentral.onlineLoja)} + Leilões ${fmtBRL(metaCentral.onlineLeilao)} — dado real do mês.`}
          />
          <Trilho
            icone={Store}
            titulo="Física (loja/distribuidora)"
            valor={metaCentral.fisica}
            meta={metaCentral.metaFisica}
            semFonte={metaCentral.fisica === null}
            detalhe="O sistema ainda não registra venda física — o trilho ativa quando existir lançamento."
          />
        </div>
      </CardContent>
    </Card>
  );
}
