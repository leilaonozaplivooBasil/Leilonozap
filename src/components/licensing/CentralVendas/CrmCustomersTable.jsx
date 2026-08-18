import React from 'react';
import { fmtBR } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Mail, Phone, Send, Trash2, Gavel } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ROLE_LABEL } from '@/lib/crmUnifiedCustomers';

// ☀️ Redesenho (18/08/2026): tabela em tema branco + verde institucional,
// badges neutros (sem arco-íris). Ações (encaminhar/excluir) só aparecem em
// clientes cadastrados manualmente — as linhas automáticas (indicação / loja
// virtual) vêm de outras tabelas e não podem ser editadas/excluídas por aqui.
const STATUS_LABEL = { lead: 'Lead', cliente: 'Cliente', inativo: 'Inativo' };
const PURCHASE_LABEL = {
  sem_compra: 'Sem Compra', em_negociacao: 'Em Negociação', aguardando_pagamento: 'Aguardando Pagamento',
  pago: 'Pago', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado',
};
const SOURCE_PART_LABEL = { cadastro: 'Cadastro', loja_virtual: 'Loja Virtual', leilao: 'Leilão', indicacao: 'Indicação', site: 'Site', whatsapp: 'WhatsApp', redes_sociais: 'Redes Sociais', outro: 'Outro' };
const formatSource = (source) => (source || '').split('+').map((p) => SOURCE_PART_LABEL[p] || p).join(' + ');

export default function CrmCustomersTable({ customers, onForward, onDelete }) {
  const navigate = useNavigate();

  return (
    <Card className="bg-white border-nz-borda">
      <CardHeader>
        <CardTitle className="text-nz-tinta">Clientes ({customers.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nz-borda bg-nz-cinza-fundo">
                <th className="text-left p-3 font-semibold text-nz-tinta">Nome</th>
                <th className="text-left p-3 font-semibold text-nz-tinta">Contato</th>
                <th className="text-left p-3 font-semibold text-nz-tinta">Endereço</th>
                <th className="text-center p-3 font-semibold text-nz-tinta">Tipo</th>
                <th className="text-center p-3 font-semibold text-nz-tinta">Status</th>
                <th className="text-center p-3 font-semibold text-nz-tinta">Compra</th>
                <th className="text-center p-3 font-semibold text-nz-tinta">Leilões</th>
                <th className="text-center p-3 font-semibold text-nz-tinta">Origem</th>
                <th className="text-center p-3 font-semibold text-nz-tinta">Último Contato</th>
                <th className="text-right p-3 font-semibold text-nz-tinta">Gasto Total</th>
                <th className="text-center p-3 font-semibold text-nz-tinta">Ações</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, index) => {
                const isManual = customer.origin_type === 'manual';
                return (
                  <tr
                    key={customer.id}
                    onClick={() => { if (isManual) navigate(createPageUrl('CustomerDetails') + `?id=${customer.id}`); }}
                    className={`border-b border-nz-borda transition-colors ${isManual ? 'cursor-pointer hover:bg-nz-cinza-fundo' : ''} ${index % 2 === 0 ? 'bg-white' : 'bg-nz-cinza-fundo/40'}`}
                  >
                    <td className="p-3 text-nz-tinta font-medium">{customer.full_name}</td>
                    <td className="p-3 text-nz-tinta-fraca">
                      <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{customer.email || '-'}</div>
                      <div className="flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{customer.phone || '-'}</div>
                    </td>
                    <td className="p-3 text-nz-tinta-fraca max-w-[220px] truncate" title={customer.address}>{customer.address || '-'}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-nz-marrom-fundo text-nz-marrom-escuro">
                        {ROLE_LABEL[customer.role_type] || 'Cliente'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-nz-verde-fundo text-nz-verde">
                        {STATUS_LABEL[customer.status] || customer.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-nz-cinza-fundo text-nz-tinta-fraca border border-nz-borda">
                        {PURCHASE_LABEL[customer.purchase_status] || customer.purchase_status}
                      </span>
                    </td>
                    <td className="p-3 text-center text-nz-tinta-fraca">
                      {customer.auctions_won > 0 ? (
                        <span className="inline-flex items-center gap-1 text-nz-verde font-semibold"><Gavel className="w-3.5 h-3.5" />{customer.auctions_won}</span>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-nz-cinza-fundo text-nz-tinta-fraca border border-nz-borda">
                        {formatSource(customer.source)}
                      </span>
                    </td>
                    <td className="p-3 text-center text-nz-tinta-fraca">
                      {customer.last_contact ? new Date(customer.last_contact).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="p-3 text-right text-nz-verde font-bold">R$ {fmtBR(customer.total_spent || 0)}</td>
                    <td className="p-3">
                      {isManual ? (
                        <div className="flex items-center justify-center gap-2">
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onForward(customer.raw); }} className="text-nz-verde hover:bg-nz-verde-fundo" title="Encaminhar para Vendedor">
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(customer.id); }} className="text-red-500 hover:bg-red-50" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-nz-tinta-fraca text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {customers.length === 0 && (
            <div className="text-center py-12 text-nz-tinta-fraca">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p>Nenhum cliente encontrado</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}