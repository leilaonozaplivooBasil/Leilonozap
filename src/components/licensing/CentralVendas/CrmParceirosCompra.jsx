import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, TrendingUp, HandCoins } from 'lucide-react';
import StatInfoTooltip from './StatInfoTooltip';
import { BUCKETS_CAPTACAO } from '@/lib/captacaoParceiros';

// 🎯 DIR-22 (30/08/2026) — Gestão de Parceiros de Compra dentro do CRM.
// A meta de R$ 1.000.000 é de CAPTAÇÃO/EXPANSÃO (decisão do dono): aportes de
// parceiro de compra ("como se fosse investimento") + vendas de "franquias"
// (adesões de cargo — vendedor, licenciado, loja física, ponto de retirada,
// parceiro e distribuidor; não é franchising formal, é a analogia do dono).
// Venda de mercadoria da Loja/Leilão NÃO entra aqui. Regra e ordem dos baldes:
// src/lib/captacaoParceiros.js.
const fmtBRL = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtData = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '-');

export default function CrmParceirosCompra({ captacao, parceiros = [] }) {
  const pct = Math.min(100, (captacao.total / captacao.meta) * 100);
  return (
    <Card className="bg-white border-nz-borda mb-4 sm:mb-6">
      <CardContent className="p-4 sm:p-5">
        <p className="text-sm font-semibold text-nz-tinta mb-1 flex items-center gap-2">
          <Target className="w-4 h-4 text-nz-verde" />
          Parceiros de Compra — Meta de Captação R$ 1.000.000
          <StatInfoTooltip text="Tudo que entra de captação/expansão: aportes de parceiro de compra (funcionam como investimento) + vendas de adesões de cargo (vendedor, licenciado, loja física, ponto de retirada, parceiro e distribuidor). Só dinheiro real (pago + confirmado + a partir de 01/08). Venda de mercadoria da Loja/Leilão não entra — a meta é de captação, não de produto." />
        </p>

        {/* Barra da meta */}
        <div className="mb-1 flex items-end justify-between">
          <span className="text-2xl font-bold text-nz-verde">{fmtBRL(captacao.total)}</span>
          <span className="text-xs text-nz-tinta-fraca">faltam {fmtBRL(captacao.faltam)} · {pct.toFixed(1).replace('.', ',')}% da meta</span>
        </div>
        <div className="h-3 rounded-full bg-nz-cinza-fundo border border-nz-borda overflow-hidden mb-4">
          <div className="h-full bg-nz-verde rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>

        {/* Baldes na ORDEM OFICIAL do dono */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
          {BUCKETS_CAPTACAO.map((b) => {
            const valor = captacao.porBucket[b.id] || 0;
            if (b.id === 'outras_adesoes' && valor === 0) return null; // balde residual só aparece se tiver algo
            return (
              <div key={b.id} className="rounded-lg border border-nz-borda bg-nz-cinza-fundo p-2.5">
                <p className="text-[11px] text-nz-tinta-fraca mb-1 leading-tight">{b.label}</p>
                <p className="text-sm font-bold text-nz-tinta">{fmtBRL(valor)}</p>
              </div>
            );
          })}
        </div>

        {/* Parceiros ativos */}
        <p className="text-xs text-nz-tinta-fraca mb-2 uppercase tracking-wide flex items-center gap-1.5">
          <HandCoins className="w-3.5 h-3.5" /> Parceiros de compra ({parceiros.length})
        </p>
        {parceiros.length === 0 ? (
          <p className="text-sm text-nz-tinta-fraca">Nenhum parceiro de compra no seu escopo ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-nz-borda bg-nz-cinza-fundo">
                  <th className="text-left p-2 font-semibold text-nz-tinta">Parceiro</th>
                  <th className="text-left p-2 font-semibold text-nz-tinta">Plano</th>
                  <th className="text-right p-2 font-semibold text-nz-tinta">Valor do plano</th>
                  <th className="text-right p-2 font-semibold text-nz-tinta">Aportes pagos</th>
                  <th className="text-center p-2 font-semibold text-nz-tinta">Ativado em</th>
                  <th className="text-center p-2 font-semibold text-nz-tinta">Origem</th>
                </tr>
              </thead>
              <tbody>
                {parceiros.map((p) => (
                  <tr key={p.id} className="border-b border-nz-borda hover:bg-nz-cinza-fundo">
                    <td className="p-2 text-nz-tinta font-medium">{p.user_name || p.user_email || 'Sem nome'}</td>
                    <td className="p-2 text-nz-tinta-fraca">{p.plan_name || '-'}</td>
                    <td className="p-2 text-right text-nz-tinta">{fmtBRL(p.plan_amount)}</td>
                    <td className="p-2 text-right text-nz-verde font-semibold">{fmtBRL(p.aportado)}</td>
                    <td className="p-2 text-center text-nz-tinta-fraca">{fmtData(p.activated_at)}</td>
                    <td className="p-2 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-nz-cinza-fundo text-nz-tinta-fraca border border-nz-borda">
                        {p.activation_source === 'manual' ? 'Ativação manual' : 'Lucre Conosco'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
