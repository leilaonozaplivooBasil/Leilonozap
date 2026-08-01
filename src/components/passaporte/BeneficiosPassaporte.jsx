import React from 'react';
import { Wallet, Gavel, ShoppingBag, Infinity as InfinityIcon } from 'lucide-react';

const ITENS = [
  {
    Icon: Wallet,
    titulo: 'R$ 110 de crédito por R$ 100',
    texto: 'O bônus de 10% entra na carteira junto com o valor pago, na hora.',
  },
  {
    Icon: Gavel,
    titulo: 'Lance livre, sem cota',
    texto: 'Você dá quantos lances quiser enquanto tiver saldo na carteira.',
  },
  {
    Icon: ShoppingBag,
    titulo: 'Até 90% de economia na loja',
    texto: 'Loja Virtual com até 80% de desconto + os 10% do seu crédito. Ex.: item de R$ 500 pode sair por cerca de R$ 50.',
  },
  {
    Icon: InfinityIcon,
    titulo: 'Sem validade',
    texto: 'O crédito fica na sua carteira até você decidir usar.',
  },
];

export default function BeneficiosPassaporte() {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45 mb-4">O que você recebe</p>
      <div className="grid gap-3">
        {ITENS.map(({ Icon, titulo, texto }) => (
          <div key={titulo} className="flex items-start gap-3">
            <span className="mt-0.5 w-9 h-9 shrink-0 rounded-xl border border-emerald-400/25 bg-emerald-400/10 grid place-items-center">
              <Icon className="w-4 h-4 text-emerald-300" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{titulo}</p>
              <p className="text-xs text-white/55 leading-relaxed mt-0.5">{texto}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 pt-4 border-t border-white/10 text-xs text-white/50 leading-relaxed">
        Se você <span className="text-white/80 font-medium">arrematar</span>, o bônus de R$ 10 é recolhido do saldo —
        o valor pago virou compra. O bônus é o prêmio de quem participa e não leva.
      </p>
    </div>
  );
}