import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Layers } from 'lucide-react';
import StatInfoTooltip from './StatInfoTooltip';

// 🪜 DIR-23 (30/08/2026) — ESCADA OFICIAL DE LICENÇAS ("franquia" na analogia
// do dono): os 7 degraus da apresentação oficial, de Influenciador (grátis,
// 5%) a Distribuidor (R$ 4 milhões, 20%), cruzados com as vendas REAIS de
// adesão: N vendidos × preço de tabela ao lado do captado de verdade —
// divergência é sinal de desconto ou inconsistência e fica visível.
// Regra e números: src/lib/escadaLicencas.js.
const fmtBRL = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtBRL0 = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;

export default function CrmEscadaLicencas({ escada }) {
  const { niveis, outras } = escada;
  return (
    <Card className="bg-white border-nz-borda mb-4 sm:mb-6">
      <CardContent className="p-4 sm:p-5">
        <p className="text-sm font-semibold text-nz-tinta mb-1 flex items-center gap-2">
          <Layers className="w-4 h-4 text-nz-verde" />
          Escada de Licenças — de Influenciador a Distribuidor
          <StatInfoTooltip text="O plano oficial de licenças da apresentação: investimento, comissão e quem cadastra quem, degrau por degrau. As colunas de venda cruzam o plano com a realidade: quantas licenças de cada degrau foram vendidas de verdade (dinheiro real), quanto entrou e quanto seria pelo preço de tabela — se divergir, houve desconto ou inconsistência, e o número mostra." />
        </p>
        <p className="text-xs text-nz-tinta-fraca mb-3">Preços e comissões oficiais · vendas pelo critério de dinheiro real</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nz-borda bg-nz-cinza-fundo">
                <th className="text-left p-2 font-semibold text-nz-tinta">Degrau</th>
                <th className="text-right p-2 font-semibold text-nz-tinta">Investimento</th>
                <th className="text-center p-2 font-semibold text-nz-tinta">Comissão</th>
                <th className="text-left p-2 font-semibold text-nz-tinta hidden lg:table-cell">Cadastra</th>
                <th className="text-left p-2 font-semibold text-nz-tinta hidden lg:table-cell">É cadastrado por</th>
                <th className="text-center p-2 font-semibold text-nz-tinta">Vendidas</th>
                <th className="text-right p-2 font-semibold text-nz-tinta">Captado real</th>
                <th className="text-right p-2 font-semibold text-nz-tinta">Tabela</th>
              </tr>
            </thead>
            <tbody>
              {niveis.map((n) => {
                const diverge = n.vendidos > 0 && Math.abs(n.divergencia) >= 0.01;
                return (
                  <tr key={n.id} className="border-b border-nz-borda hover:bg-nz-cinza-fundo">
                    <td className="p-2 text-nz-tinta font-medium">{n.label}</td>
                    <td className="p-2 text-right text-nz-tinta">{n.investimento === 0 ? 'Grátis' : fmtBRL0(n.investimento)}</td>
                    <td className="p-2 text-center text-nz-tinta">{n.comissao}%</td>
                    <td className="p-2 text-nz-tinta-fraca hidden lg:table-cell">{n.cadastra}</td>
                    <td className="p-2 text-nz-tinta-fraca hidden lg:table-cell">{n.cadastradoPor}</td>
                    <td className="p-2 text-center font-semibold text-nz-tinta">{n.vendidos}</td>
                    <td className={`p-2 text-right font-semibold ${diverge ? 'text-amber-700' : 'text-nz-verde'}`}>
                      {n.vendidos ? fmtBRL(n.captadoReal) : '—'}
                      {diverge && (
                        <span className="block text-[10px] font-normal text-amber-700">
                          {n.divergencia > 0 ? '+' : ''}{fmtBRL(n.divergencia)} vs tabela
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-right text-nz-tinta-fraca">{n.vendidos ? fmtBRL(n.valorTabela) : '—'}</td>
                  </tr>
                );
              })}
              {outras.vendidos > 0 && (
                <tr className="border-b border-nz-borda bg-amber-50/50">
                  <td className="p-2 text-amber-700 font-medium" colSpan={5}>Adesões de cargo não reconhecido (verificar)</td>
                  <td className="p-2 text-center font-semibold text-amber-700">{outras.vendidos}</td>
                  <td className="p-2 text-right font-semibold text-amber-700">{fmtBRL(outras.captadoReal)}</td>
                  <td className="p-2 text-right text-nz-tinta-fraca">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
