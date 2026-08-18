import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Mail, Phone, UserPlus, ShoppingCart, Gavel, Calendar } from 'lucide-react';
import { fmtBR } from '@/lib/money';
import { ROLE_LABEL } from '@/lib/crmUnifiedCustomers';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '-');

// 🔎 Funil real do cliente: quando entrou, quem indicou e cada compra/arremate
// — substitui o resumo vago ("Cadastro + Loja Virtual, R$ 617") por uma linha
// do tempo que qualquer vendedor consegue usar pra decidir o próximo passo.
export default function CrmCustomerDetailModal({ customer, onClose }) {
  if (!customer) return null;
  const timeline = [
    ...(customer.purchases || []).map((p) => ({ type: 'compra', date: p.date, label: p.product_title || 'Produto', amount: p.amount, status: p.status })),
    ...(customer.auctions_list || []).map((a) => ({ type: 'leilao', date: a.date, label: a.title || 'Leilão', amount: a.amount })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-white border-nz-borda max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b border-nz-borda flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-nz-tinta text-lg">{customer.full_name}</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-nz-tinta-fraca hover:text-nz-tinta">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto flex-1 p-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-nz-marrom-fundo text-nz-marrom-escuro">
              {ROLE_LABEL[customer.role_type] || 'Cliente'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-nz-verde-fundo text-nz-verde">
              {customer.status === 'cliente' ? 'Cliente' : customer.status === 'lead' ? 'Lead' : 'Inativo'}
            </span>
          </div>

          <div className="space-y-1.5 text-sm text-nz-tinta">
            {customer.email && <p className="flex items-center gap-2 text-nz-tinta-fraca"><Mail className="w-4 h-4" />{customer.email}</p>}
            {customer.phone && <p className="flex items-center gap-2 text-nz-tinta-fraca"><Phone className="w-4 h-4" />{customer.phone}</p>}
            {customer.registered_at && <p className="flex items-center gap-2 text-nz-tinta-fraca"><Calendar className="w-4 h-4" />Cadastrado em {fmtDate(customer.registered_at)}</p>}
            {customer.referred_by_name && <p className="flex items-center gap-2 text-nz-tinta-fraca"><UserPlus className="w-4 h-4" />Indicado por {customer.referred_by_name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-nz-cinza-fundo rounded-lg p-3 text-center">
              <p className="text-xs text-nz-tinta-fraca mb-1">Pedidos na Loja</p>
              <p className="text-xl font-bold text-nz-tinta">{customer.purchase_count || 0}</p>
            </div>
            <div className="bg-nz-cinza-fundo rounded-lg p-3 text-center">
              <p className="text-xs text-nz-tinta-fraca mb-1">Leilões Arrematados</p>
              <p className="text-xl font-bold text-nz-tinta">{customer.auctions_won || 0}</p>
            </div>
          </div>

          <div className="bg-nz-verde-fundo rounded-lg p-3 text-center">
            <p className="text-xs text-nz-tinta-fraca mb-1">Total Gasto</p>
            <p className="text-2xl font-bold text-nz-verde">R$ {fmtBR(customer.total_spent || 0)}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-nz-tinta mb-2">Histórico</p>
            {timeline.length === 0 ? (
              <p className="text-sm text-nz-tinta-fraca">Nenhuma compra ou arremate ainda — ainda é só um lead.</p>
            ) : (
              <div className="space-y-2">
                {timeline.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white border border-nz-borda rounded-lg p-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.type === 'compra' ? <ShoppingCart className="w-4 h-4 text-nz-marrom flex-shrink-0" /> : <Gavel className="w-4 h-4 text-nz-verde flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm text-nz-tinta truncate">{item.label}</p>
                        <p className="text-xs text-nz-tinta-fraca">{fmtDate(item.date)}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-nz-tinta flex-shrink-0 ml-2">R$ {fmtBR(item.amount || 0)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}