import React from 'react';
import { Ticket, Lock } from 'lucide-react';
import { money } from '@/lib/format';

/**
 * Banner do Cupom Passaporte no carrinho.
 * 'liberado' → botão de 1 toque pra usar o crédito (10% do valor aportado).
 * 'bloqueado' → explica que libera após disputar um leilão e não arrematar.
 */
export default function PassaporteCouponBanner({ status, aplicado, desconto, onUsar, onRemover }) {
  if (!status) return null;

  if (status.liberado) {
    const saldo = status.liberado.saldo;
    return (
      <div className="rounded-xl border border-green-500/40 bg-green-600/15 p-4">
        <div className="flex items-start gap-3">
          <Ticket className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-green-400 font-bold text-sm">
              Você tem mais 10% de desconto pela compra do Passaporte do Leilão
            </p>
            <p className="text-green-300/80 text-xs mt-1">
              {aplicado
                ? `Aplicado: −${money(desconto)} · Sobra ${money(Math.max(0, saldo - desconto))} guardado`
                : `${money(saldo)} de crédito disponível — sem validade, o que sobrar fica guardado.`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={aplicado ? onRemover : onUsar}
          className={`mt-3 w-full min-h-[44px] rounded-lg font-bold text-sm transition-colors ${
            aplicado
              ? 'bg-gray-700 text-white hover:bg-gray-600'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {aplicado ? 'Não usar agora' : 'Usar meu desconto'}
        </button>
      </div>
    );
  }

  if (status.tem_bloqueado) {
    return (
      <div className="rounded-xl border border-gray-600 bg-gray-800 p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm">Seu desconto de 10% está guardado</p>
          <p className="text-gray-400 text-xs mt-1">
            Ele é liberado depois que você disputar um leilão e não arrematar.
          </p>
        </div>
      </div>
    );
  }

  return null;
}