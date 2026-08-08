import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import IconeAtividade from './IconeAtividade';

const STATUS_STYLE = {
  pending: 'text-orange-500',
  confirmed: 'text-emerald-600',
  paid: 'text-emerald-600',
};
const STATUS_LABEL = {
  pending: 'Pendente',
  confirmed: 'Aprovado',
  paid: 'Aprovado',
};

// 🧾 "Últimas atividades" — formato Mercado Pago: ícone + descrição + status
// colorido + valor à direita.
export default function ActivityFeedCard({ records, isSaiDeBaixo }) {
  const list = (Array.isArray(records) ? records : []).slice(0, 8);
  const accent = isSaiDeBaixo ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600';

  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-900">Últimas atividades</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {list.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Nenhuma atividade recente.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {list.map((rec) => {
              const isCatalog = rec.sale_type === 'catalog';
              const statusKey = rec.status || 'pending';
              return (
                <div key={rec.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${accent}`}>
                    <IconeAtividade tipo={isCatalog ? 'catalog' : 'auction'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{rec.product_title || (isCatalog ? 'Venda Loja Virtual' : 'Comissão de Leilão')}</p>
                    <p className="text-xs text-gray-400">{new Date(rec.created_date).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-medium ${STATUS_STYLE[statusKey] || 'text-gray-400'}`}>
                      {STATUS_LABEL[statusKey] || statusKey}
                    </p>
                    <p className="text-sm font-bold text-emerald-600">+ R$ {(rec.amount || 0).toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}