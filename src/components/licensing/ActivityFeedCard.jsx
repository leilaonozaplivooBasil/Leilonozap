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

// 🏷️ Rótulo amigável do papel do usuário na comissão — identifica POR QUE essa
// linha existe (vendedor, licenciado, executivo…), já que várias linhas podem
// vir do MESMO pedido (uma por nível da cadeia de comissão).
const ROLE_LABELS = {
  influencer_app: 'Influencer',
  licenciado_catalogo: 'Licenciado',
  trainee: 'Trainee',
  executivo: 'Executivo',
  kit_start: 'Kit Start',
  plano_lider: 'Líder',
  plano_lojista: 'Lojista',
  distribuidor: 'Distribuidor',
  diretor: 'Diretor',
  diretoria: 'Diretoria',
  ceo: 'CEO',
  conselheiro: 'Conselheiro',
  fundador: 'Fundador',
  site_official_rollup: 'Site Oficial',
  vendedor: 'Vendedor',
};

// 🧾 "Últimas atividades" — formato Mercado Pago: ícone + descrição + status
// colorido + valor à direita.
export default function ActivityFeedCard({ records, isSaiDeBaixo }) {
  const list = (Array.isArray(records) ? records : []).slice(0, 8);

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
                  <IconeAtividade tipo={isCatalog ? 'catalog' : 'auction'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{rec.product_title || (isCatalog ? 'Venda Loja Virtual' : 'Comissão de Leilão')}</p>
                    {/* 🆕 Identifica de onde vem o pedido: nome do responsável (licenciado
                        âncora da loja) + o papel dessa comissão (vendedor, executivo…) —
                        sem isso, várias linhas do mesmo pedido pareciam idênticas. */}
                    <p className="text-xs text-gray-400 truncate">
                      {rec.anchor_user_name && <span className="text-gray-600 font-medium">{rec.anchor_user_name}</span>}
                      {rec.anchor_user_name && <span className="mx-1.5">·</span>}
                      <span className="text-gray-500">{ROLE_LABELS[rec.role] || (isCatalog ? 'Loja Virtual' : 'Leilão')}</span>
                      <span className="mx-1.5">·</span>
                      {new Date(rec.created_date).toLocaleString('pt-BR')}
                    </p>
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