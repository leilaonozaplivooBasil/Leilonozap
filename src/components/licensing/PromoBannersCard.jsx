import React from 'react';
import { Card } from "@/components/ui/card";
import { Store, TrendingUp, ArrowRight } from 'lucide-react';

// 📣 Coluna de banners — no lugar dos anúncios do Mercado Pago, mostra
// convite pra virar Vendedor/Licenciado + espaço da própria loja.
export default function PromoBannersCard({ user, isSaiDeBaixo, onGoVendedores, onEditStore }) {
  const accent = isSaiDeBaixo ? 'from-red-600 to-red-700' : 'from-emerald-600 to-green-700';
  return (
    <div className="flex flex-col gap-4 h-full">
      <Card
        onClick={onGoVendedores}
        className={`flex-1 cursor-pointer bg-gradient-to-br ${accent} border-0 text-white p-5 flex flex-col justify-between hover:shadow-lg transition-shadow`}
      >
        <div>
          <TrendingUp className="w-6 h-6 mb-2 opacity-90" />
          <p className="font-bold text-base leading-snug">Ganhe 30% de comissão</p>
          <p className="text-xs opacity-90 mt-1">Convide vendedores e licenciados pra sua estrutura.</p>
        </div>
        <span className="text-sm font-semibold flex items-center gap-1 mt-3">
          Quero começar <ArrowRight className="w-4 h-4" />
        </span>
      </Card>

      <Card
        onClick={onEditStore}
        className="flex-1 cursor-pointer bg-white border-gray-200 p-5 flex items-center gap-4 hover:shadow-lg transition-shadow"
      >
        <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Minha loja" className="w-full h-full object-cover" />
          ) : (
            <Store className="w-6 h-6 text-gray-400" />
          )}
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900">{user?.store_name || 'Minha Loja'}</p>
          <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
            Editar minha loja <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </Card>
    </div>
  );
}