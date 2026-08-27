import React from 'react';
import { Wallet, Gavel, ShoppingBag, Infinity as InfinityIcon } from 'lucide-react';

const ITENS = [
  // 🔴 REESCRITO EM 27/08/2026. Dizia "aparece na sua carteira na hora" — e o rodapé
  // deste MESMO componente dizia "libera assim que o leilão terminar". As duas frases
  // estavam na mesma tela e uma delas era falsa desde 19/08, quando o bônus passou a
  // nascer bloqueado. Agora as duas contam a mesma história.
  {
    Icon: Wallet,
    titulo: '+10% de crédito para a Loja Virtual',
    texto: 'Depositou R$ 100, ganha R$ 10 de crédito guardado. Ele libera conforme os leilões que você disputar forem terminando sem vitória — não cai na carteira no ato, e nunca entra no saldo de lance.',
  },
  {
    Icon: Gavel,
    titulo: 'Lance livre, sem cota',
    texto: 'Você dá quantos lances quiser enquanto tiver saldo depositado (sem contar o bônus).',
  },
  {
    Icon: ShoppingBag,
    titulo: 'Até 90% de economia na loja',
    texto: 'Loja Virtual com até 80% de desconto + os 10% do seu crédito. Ex.: item de R$ 500 pode sair por cerca de R$ 50.',
  },
  {
    Icon: InfinityIcon,
    titulo: 'Sem validade',
    texto: 'Depois de liberado, o crédito fica guardado até você decidir usar. Não expira.',
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
        Cada leilão resolve a fatia dele: se você <span className="text-white/80 font-medium">não ganhar</span>, libera
        10% do lance que você deu <span className="text-white/80 font-medium">naquele leilão</span>, assim que ele terminar.
        Se você <span className="text-white/80 font-medium">arrematar</span>, essa fatia é cancelada — o valor pago virou a
        sua compra. Espalhou R$ 100 em dez lances de R$ 10? O crédito volta em dez pedaços, conforme cada leilão fecha.
        Ele nunca pode ser usado pra dar lance.
      </p>
    </div>
  );
}