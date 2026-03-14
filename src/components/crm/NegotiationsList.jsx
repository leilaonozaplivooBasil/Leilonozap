import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, Calendar, User, Package
} from 'lucide-react';

export default function NegotiationsList({ negotiations, onNegotiationClick }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'em_andamento': return 'bg-blue-100 text-blue-800';
      case 'fechada': return 'bg-green-100 text-green-800';
      case 'perdida': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'em_andamento': 'Em Andamento',
      'fechada': 'Fechada',
      'perdida': 'Perdida'
    };
    return labels[status] || status;
  };

  if (negotiations.length === 0) {
    return (
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            💼 Negociações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma negociação registrada ainda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          💼 Negociações ({negotiations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {negotiations.map(neg => (
          <div
            key={neg.id}
            onClick={() => onNegotiationClick?.(neg)}
            className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={getStatusColor(neg.status)}>
                    {getStatusLabel(neg.status)}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {new Date(neg.created_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{neg.seller_name}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  R$ {(neg.total_value || 0).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">{neg.items?.length || 0} produtos</p>
              </div>
            </div>

            {/* PRODUTOS */}
            <div className="space-y-1">
              {(neg.items || []).slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                  <Package className="w-3 h-3" />
                  <span className="flex-1 truncate">{item.product_name}</span>
                  <span className="font-medium">
                    {item.quantity}x R$ {item.negotiated_price?.toFixed(2)}
                  </span>
                </div>
              ))}
              {(neg.items?.length || 0) > 3 && (
                <p className="text-xs text-gray-500 italic">
                  + {neg.items.length - 3} produtos...
                </p>
              )}
            </div>

            {neg.notes && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600 italic">
                  💬 {neg.notes}
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}