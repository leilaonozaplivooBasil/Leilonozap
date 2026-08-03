import React from 'react';
import { Megaphone, ShoppingBag, ArrowRight } from 'lucide-react';

// 📣 Dois banners de largura cheia lado a lado — substituem "Análise do mês"
// + banners promocionais, no formato pedido: um pra divulgar o link, outro
// pra compartilhar produtos da Loja Virtual.
export default function LicensingBanners({ onCopyLink, onShareProducts }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white p-6 md:p-8 min-h-[160px] flex flex-col justify-between">
        <Megaphone className="w-8 h-8 opacity-90" />
        <div>
          <p className="text-lg md:text-xl font-bold leading-snug mb-1">Divulgue seu link e ganhe comissão</p>
          <p className="text-sm opacity-90 mb-4">Compartilhe com amigos e clientes — toda compra vira dinheiro pra você.</p>
          <button
            type="button"
            onClick={onCopyLink}
            className="inline-flex items-center gap-2 text-sm font-semibold bg-white text-emerald-700 rounded-full px-4 py-2 hover:bg-emerald-50 transition-colors">
            Compartilhar link <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 p-6 md:p-8 min-h-[160px] flex flex-col justify-between">
        <ShoppingBag className="w-8 h-8 text-emerald-600" />
        <div>
          <p className="text-lg md:text-xl font-bold text-gray-900 leading-snug mb-1">Compartilhe produtos da Loja Virtual</p>
          <p className="text-sm text-gray-500 mb-4">Envie os produtos direto pro WhatsApp dos seus clientes.</p>
          <button
            type="button"
            onClick={onShareProducts}
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
            Ver produtos <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}