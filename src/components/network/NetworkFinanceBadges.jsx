import React from 'react';
import { Users, DollarSign, Wallet, ShoppingBag } from 'lucide-react';
import { fmtBR } from '@/lib/money';

/**
 * Badges de resumo da rede: pessoas no sistema, depósitos na Carteira Digital
 * (saldo usado para lance/passaporte) e compras confirmadas na Loja Virtual.
 * São dois números DIFERENTES de propósito — por isso ficam separados, nunca somados.
 *
 * compact=true → versão reduzida para caber na barra de ferramentas da árvore,
 * que continua visível mesmo em tela cheia (a barra de resumo de fora não fica).
 */
export default function NetworkFinanceBadges({ peopleCount, financeStats, compact = false }) {
  const { depositsCount, depositsTotal, purchasesCount, purchasesTotal } = financeStats;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-300">
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <Users className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          <strong className="text-white">{peopleCount}</strong> pessoas
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap" title="Depósitos na Carteira Digital (saldo de lance / passaporte)">
          <Wallet className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
          <strong className="text-green-400">{depositsCount}</strong>
          <strong className="text-green-400">R$ {fmtBR(depositsTotal)}</strong>
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap" title="Compras confirmadas na Loja Virtual (catálogo)">
          <ShoppingBag className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <strong className="text-blue-300">{purchasesCount}</strong>
          <strong className="text-blue-300">R$ {fmtBR(purchasesTotal)}</strong>
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 text-[12px] text-gray-400">
      <span className="flex items-center gap-1.5 rounded-lg border border-gray-700/70 bg-gray-800/50 px-2.5 py-2 sm:border-0 sm:bg-transparent sm:p-0 whitespace-nowrap">
        <Users className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        <strong className="text-white">{peopleCount}</strong> no sistema
      </span>
      <span className="flex items-center gap-1.5 rounded-lg border border-gray-700/70 bg-gray-800/50 px-2.5 py-2 sm:border-0 sm:bg-transparent sm:p-0 whitespace-nowrap" title="Depósitos na Carteira Digital (saldo de lance / passaporte)">
        <Wallet className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        <strong className="text-green-400">{depositsCount} depósitos</strong>
        <strong className="text-green-400">· R$ {fmtBR(depositsTotal)}</strong>
      </span>
      <span className="flex items-center gap-1.5 rounded-lg border border-gray-700/70 bg-gray-800/50 px-2.5 py-2 sm:border-0 sm:bg-transparent sm:p-0 whitespace-nowrap" title="Compras confirmadas na Loja Virtual (catálogo)">
        <ShoppingBag className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        <strong className="text-blue-300">{purchasesCount} compras</strong>
        <strong className="text-blue-300">· R$ {fmtBR(purchasesTotal)}</strong>
      </span>
    </div>
  );
}