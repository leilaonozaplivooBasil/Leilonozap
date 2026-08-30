import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Gauge } from 'lucide-react';
import StatInfoTooltip from './StatInfoTooltip';

// 📊 DIR-23 (30/08/2026) — DASHBOARD DIÁRIO DA DIRETORIA: os 12 números da
// Seção 37 do Resumo Executivo, cada um com Realizado × Meta e a etiqueta de
// governança do próprio documento ("separar Dado realizado / Premissa /
// Projeção"): Dado = medido de venda/cadastro real; Aproximação = medido com
// fórmula-proxy declarada; Sem fonte = o sistema ainda não mede (pendência
// explícita — nunca número inventado). Regra: src/lib/dashboardDiretoria.js.
const fmtBRL = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (v) => (v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

function fmtValor(v, unidade) {
  if (v === null || v === undefined) return '—';
  if (unidade === 'brl') return fmtBRL(v);
  if (unidade === 'pct') return `${fmtNum(v)}%`;
  if (unidade === 'x') return `${fmtNum(v)}×`;
  return fmtNum(v);
}

const ETIQUETAS = {
  dado: { texto: 'Dado', cls: 'bg-nz-verde/10 text-nz-verde border-nz-verde/30' },
  aproximacao: { texto: 'Aproximação', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  sem_fonte: { texto: 'Sem fonte', cls: 'bg-nz-cinza-fundo text-nz-tinta-fraca border-nz-borda' },
};

function KpiCard({ kpi }) {
  const etiqueta = ETIQUETAS[kpi.tipo] || ETIQUETAS.sem_fonte;
  const temNumero = kpi.realizado !== null && kpi.realizado !== undefined;
  // Custo de aquisição tem meta-TETO (quanto menor, melhor) — barra não se aplica.
  const pct = temNumero && kpi.meta && !kpi.metaEhTeto ? Math.min(100, (kpi.realizado / kpi.meta) * 100) : null;
  return (
    <div className="rounded-lg border border-nz-borda bg-nz-cinza-fundo p-2.5">
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className="text-[11px] text-nz-tinta-fraca leading-tight">{kpi.label}</p>
        <StatInfoTooltip text={kpi.fonte} />
      </div>
      <p className={`text-sm font-bold ${temNumero ? 'text-nz-tinta' : 'text-nz-tinta-fraca'}`}>{fmtValor(kpi.realizado, kpi.unidade)}</p>
      <p className="text-[11px] text-nz-tinta-fraca mb-1">
        meta {kpi.metaEhTeto ? '≤ ' : ''}{fmtValor(kpi.meta, kpi.unidade)}
      </p>
      {pct !== null && (
        <div className="h-1.5 rounded-full bg-white border border-nz-borda overflow-hidden mb-1.5">
          <div className="h-full bg-nz-verde rounded-full" style={{ width: `${pct}%` }} />
        </div>
      )}
      <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${etiqueta.cls}`}>{etiqueta.texto}</span>
    </div>
  );
}

export default function CrmDashboardDiretoria({ kpis = [] }) {
  return (
    <Card className="bg-white border-nz-borda mb-4 sm:mb-6">
      <CardContent className="p-4 sm:p-5">
        <p className="text-sm font-semibold text-nz-tinta mb-1 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-nz-verde" />
          Dashboard da Diretoria — os 12 números de todo dia
          <StatInfoTooltip text="Os 12 números que a diretoria acompanha diariamente (Seção 37 do Resumo Executivo), com Realizado × Meta. Governança do próprio documento: Dado (medido de venda/cadastro real), Aproximação (medido com fórmula declarada no ícone de cada card) e Sem fonte (o sistema ainda não mede — aparece como pendência, nunca como número inventado)." />
        </p>
        <p className="text-xs text-nz-tinta-fraca mb-3">Realizado × Meta · venda sempre pelo critério oficial de dinheiro real</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {kpis.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} />)}
        </div>
      </CardContent>
    </Card>
  );
}
