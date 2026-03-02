import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, UserCheck, MessageSquare, Clock, CheckCircle, DollarSign, TrendingUp, Percent } from 'lucide-react';

const fmt = (v) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function LeadStatsCards({ leads, onFilterClick, activeFilter }) {
  const total = leads.length;
  const ativos = leads.filter(l => l.status_lead === 'ativo').length;
  const emNegociacao = leads.filter(l => l.status_negociacao === 'em_negociacao').length;
  const aguardando = leads.filter(l => l.status_negociacao === 'aguardando_pagamento').length;
  const pagos = leads.filter(l => l.status_negociacao === 'pago').length;
  const faturamento = leads.filter(l => ['pago', 'enviado', 'entregue'].includes(l.status_negociacao)).reduce((s, l) => s + (l.valor_fechado || 0), 0);
  const volumeNeg = leads.filter(l => l.status_negociacao === 'em_negociacao').reduce((s, l) => s + (l.valor_negociado || 0), 0);
  const taxaConversao = total > 0 ? ((pagos / total) * 100).toFixed(1) : '0.0';

  const cards = [
    { key: 'total', label: 'Total de Leads', value: total, icon: Users, color: 'text-blue-400', bg: '' },
    { key: 'ativo', label: 'Leads Ativos', value: ativos, icon: UserCheck, color: 'text-green-400', bg: '' },
    { key: 'em_negociacao', label: 'Em Negociação', value: emNegociacao, icon: MessageSquare, color: 'text-blue-400', bg: '' },
    { key: 'aguardando_pagamento', label: 'Aguardando Pag.', value: aguardando, icon: Clock, color: 'text-yellow-400', bg: '' },
    { key: 'pago', label: 'Pagos', value: pagos, icon: CheckCircle, color: 'text-green-400', bg: '' },
    { key: 'faturamento', label: 'Faturamento Total', value: `R$ ${fmt(faturamento)}`, icon: DollarSign, color: 'text-emerald-400', bg: '' },
    { key: 'volume', label: 'Volume Negociação', value: `R$ ${fmt(volumeNeg)}`, icon: TrendingUp, color: 'text-orange-400', bg: '' },
    { key: 'conversao', label: 'Taxa de Conversão', value: `${taxaConversao}%`, icon: Percent, color: 'text-purple-400', bg: '' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4">
      {cards.map(c => {
        const isActive = activeFilter === c.key;
        const isClickable = ['total', 'ativo', 'em_negociacao', 'aguardando_pagamento', 'pago'].includes(c.key);
        return (
          <Card
            key={c.key}
            onClick={isClickable ? () => onFilterClick(isActive ? null : c.key) : undefined}
            className={`bg-gray-800 border-gray-700 transition-all ${isClickable ? 'cursor-pointer hover:bg-gray-700' : ''} ${isActive ? 'ring-2 ring-green-500 bg-gray-700' : ''}`}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs mb-1">{c.label}</p>
                  <p className={`text-xl font-bold text-white`}>{c.value}</p>
                </div>
                <c.icon className={`w-6 h-6 ${c.color}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}