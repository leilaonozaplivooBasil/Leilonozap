import React from 'react';
import { Undo2, Flame, Trophy } from 'lucide-react';

// Selo de estado do lance no extrato da carteira.
// No modelo de reserva, o dinheiro fica preso SÓ no lance que está na frente.
// Quando alguém cobre, o valor volta pro saldo. O cliente precisa LER isso —
// "estorno" assusta e parece erro; aqui falamos a língua do leilão.
const ESTADOS = {
  superado: {
    icon: Undo2,
    texto: 'você foi superado — valor devolvido',
    classe: 'text-emerald-400',
    titulo: 'Alguém cobriu seu lance. O valor reservado voltou integralmente para o seu saldo disponível.',
  },
  liderando: {
    icon: Flame,
    texto: 'seu lance está na frente — valor reservado',
    classe: 'text-amber-400',
    titulo: 'Você é o maior lance. O valor fica reservado enquanto durar a disputa. Se alguém cobrir, volta na hora.',
  },
  arrematado: {
    icon: Trophy,
    texto: 'arrematado por você',
    classe: 'text-yellow-400',
    titulo: 'Você venceu este leilão. O valor foi usado no pagamento do arremate.',
  },
};

export default function BidStateTag({ state }) {
  const info = ESTADOS[state];
  if (!info) return null;
  const Icon = info.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] leading-tight ${info.classe}`}
      title={info.titulo}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      {info.texto}
    </span>
  );
}