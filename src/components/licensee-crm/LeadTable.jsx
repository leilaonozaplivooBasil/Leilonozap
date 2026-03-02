import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Users, AlertTriangle } from 'lucide-react';

const fmt = (v) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusLeadLabels = { lead: 'Lead', ativo: 'Ativo', inativo: 'Inativo' };
const statusLeadColors = { lead: 'bg-yellow-100 text-yellow-800', ativo: 'bg-green-100 text-green-800', inativo: 'bg-gray-100 text-gray-800' };

const negLabels = {
  sem_compra: 'Sem Compra', em_negociacao: 'Em Negociação', aguardando_pagamento: 'Aguardando Pag.',
  pago: 'Pago', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado'
};
const negColors = {
  sem_compra: 'bg-gray-100 text-gray-800', em_negociacao: 'bg-blue-100 text-blue-800', aguardando_pagamento: 'bg-yellow-100 text-yellow-800',
  pago: 'bg-green-100 text-green-800', enviado: 'bg-purple-100 text-purple-800', entregue: 'bg-emerald-100 text-emerald-800', cancelado: 'bg-red-100 text-red-800'
};

const origemLabels = { site: 'Site', indicacao: 'Indicação', whatsapp: 'WhatsApp', instagram: 'Instagram', outro: 'Outro' };

function getContactAlert(lead) {
  if (!lead.ultimo_contato) return 'red';
  const days = Math.floor((Date.now() - new Date(lead.ultimo_contato).getTime()) / (1000 * 60 * 60 * 24));
  if (days >= 15) return 'red';
  if (days >= 7) return 'yellow';
  return null;
}

export default function LeadTable({ leads, onEdit, onDelete }) {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="text-white text-sm sm:text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          Leads ({leads.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800">
                <th className="text-left p-2 sm:p-3 font-semibold text-white text-xs">Nome</th>
                <th className="text-left p-2 sm:p-3 font-semibold text-white text-xs hidden md:table-cell">Email</th>
                <th className="text-left p-2 sm:p-3 font-semibold text-white text-xs hidden sm:table-cell">Telefone</th>
                <th className="text-center p-2 sm:p-3 font-semibold text-white text-xs">Status</th>
                <th className="text-center p-2 sm:p-3 font-semibold text-white text-xs">Negociação</th>
                <th className="text-center p-2 sm:p-3 font-semibold text-white text-xs hidden lg:table-cell">Origem</th>
                <th className="text-center p-2 sm:p-3 font-semibold text-white text-xs hidden lg:table-cell">Últ. Contato</th>
                <th className="text-right p-2 sm:p-3 font-semibold text-white text-xs hidden md:table-cell">Negociado</th>
                <th className="text-right p-2 sm:p-3 font-semibold text-white text-xs hidden md:table-cell">Fechado</th>
                <th className="text-center p-2 sm:p-3 font-semibold text-white text-xs">Ações</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => {
                const alert = getContactAlert(lead);
                return (
                  <tr
                    key={lead.id}
                    className={`border-b border-gray-700 hover:bg-gray-700/50 transition-colors ${i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50'}`}
                  >
                    <td className="p-2 sm:p-3 text-gray-300 font-medium">
                      <div className="flex items-center gap-1.5">
                        {alert === 'red' && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" title="Sem contato há +15 dias" />}
                        {alert === 'yellow' && <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" title="Sem contato há +7 dias" />}
                        <span className="truncate max-w-[120px] sm:max-w-none">{lead.nome}</span>
                      </div>
                    </td>
                    <td className="p-2 sm:p-3 text-gray-400 hidden md:table-cell text-xs">{lead.email || '-'}</td>
                    <td className="p-2 sm:p-3 text-gray-400 hidden sm:table-cell text-xs">{lead.telefone || '-'}</td>
                    <td className="p-2 sm:p-3 text-center">
                      <Badge className={`text-[10px] ${statusLeadColors[lead.status_lead] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLeadLabels[lead.status_lead] || lead.status_lead}
                      </Badge>
                    </td>
                    <td className="p-2 sm:p-3 text-center">
                      <Badge className={`text-[10px] ${negColors[lead.status_negociacao] || 'bg-gray-100 text-gray-800'}`}>
                        {negLabels[lead.status_negociacao] || lead.status_negociacao}
                      </Badge>
                    </td>
                    <td className="p-2 sm:p-3 text-center hidden lg:table-cell text-xs text-gray-400">
                      {origemLabels[lead.origem] || lead.origem || '-'}
                    </td>
                    <td className="p-2 sm:p-3 text-center hidden lg:table-cell text-xs text-gray-400">
                      {lead.ultimo_contato ? new Date(lead.ultimo_contato).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="p-2 sm:p-3 text-right hidden md:table-cell text-xs text-blue-400 font-semibold">
                      R$ {fmt(lead.valor_negociado)}
                    </td>
                    <td className="p-2 sm:p-3 text-right hidden md:table-cell text-xs text-green-400 font-bold">
                      R$ {fmt(lead.valor_fechado)}
                    </td>
                    <td className="p-2 sm:p-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => onEdit(lead)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 h-7 w-7 p-0">
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onDelete(lead.id)} className="text-red-400 hover:text-red-300 hover:bg-red-900/30 h-7 w-7 p-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {leads.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum lead encontrado</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}