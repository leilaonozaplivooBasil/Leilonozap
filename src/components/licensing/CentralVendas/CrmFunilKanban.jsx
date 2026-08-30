import React from 'react';
import { ShoppingCart, MessageSquare, Clock, CheckCircle, Package, Truck, XCircle } from 'lucide-react';

// 🌊 DIR-24 Fase 5 (30/08/2026) — FUNIL VISUAL (kanban) por status de compra.
// As colunas são os mesmos status dos cards (mesma fonte, buildUnifiedCustomers)
// — só muda a forma: cada cliente vira um cartão na coluna do seu momento, e o
// vendedor enxerga o funil inteiro de uma vez. Clicar no cartão abre o perfil.
// Cartão de cliente AUTOMÁTICO não se arrasta (o status vem do pedido real —
// quem muda é o pagamento/entrega, não a mão); cliente MANUAL muda de coluna
// pelo perfil (editar), onde já existe o campo de status.
const fmtBRL = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COLUNAS = [
  { key: 'sem_compra', label: 'Sem Compra', icon: ShoppingCart },
  { key: 'em_negociacao', label: 'Em Negociação', icon: MessageSquare },
  { key: 'aguardando_pagamento', label: 'Aguardando Pag.', icon: Clock },
  { key: 'pago', label: 'Pago', icon: CheckCircle },
  { key: 'enviado', label: 'Enviado', icon: Package },
  { key: 'entregue', label: 'Entregue', icon: Truck },
  { key: 'cancelado', label: 'Cancelado', icon: XCircle },
];

const MAX_POR_COLUNA = 30;

export default function CrmFunilKanban({ customers = [], onAbrirCliente }) {
  const porColuna = Object.fromEntries(COLUNAS.map((c) => [c.key, []]));
  customers.forEach((c) => {
    const key = c.purchase_status || 'sem_compra';
    (porColuna[key] || porColuna.sem_compra).push(c);
  });
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-[980px]">
        {COLUNAS.map(({ key, label, icon: Icon }) => {
          const lista = porColuna[key];
          const valorColuna = lista.reduce((s, c) => s + (c.total_spent || 0), 0);
          return (
            <div key={key} className="flex-1 min-w-[140px] rounded-xl border border-nz-borda bg-nz-cinza-fundo/50">
              <div className="p-2.5 border-b border-nz-borda flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-nz-tinta-fraca" />
                <p className="text-xs font-semibold text-nz-tinta flex-1 truncate">{label}</p>
                <span className="text-xs font-bold text-nz-verde">{lista.length}</span>
              </div>
              {key !== 'sem_compra' && valorColuna > 0 && (
                <p className="px-2.5 pt-1.5 text-[10px] text-nz-tinta-fraca">{fmtBRL(valorColuna)} em clientes aqui</p>
              )}
              <div className="p-2 space-y-1.5 max-h-[420px] overflow-y-auto">
                {lista.slice(0, MAX_POR_COLUNA).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onAbrirCliente?.(c)}
                    className="w-full text-left rounded-lg border border-nz-borda bg-white p-2 hover:border-nz-verde/50 transition-colors"
                  >
                    <p className="text-xs font-semibold text-nz-tinta truncate">{c.full_name}</p>
                    <p className="text-[10px] text-nz-tinta-fraca truncate">
                      {c.total_spent > 0 ? fmtBRL(c.total_spent) : (c.email || c.phone || '—')}
                    </p>
                  </button>
                ))}
                {lista.length > MAX_POR_COLUNA && (
                  <p className="text-[10px] text-center text-nz-tinta-fraca pt-1">+ {lista.length - MAX_POR_COLUNA} — refine os filtros</p>
                )}
                {lista.length === 0 && <p className="text-[10px] text-center text-nz-tinta-fraca py-3">vazio</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
