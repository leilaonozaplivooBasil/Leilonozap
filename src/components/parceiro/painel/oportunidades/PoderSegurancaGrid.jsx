import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { brl, vezes } from '@/lib/lastroOperacao';

// 🛡️ PODER DE SEGURANÇA — visual, número grande, frase curta.
// Só exibe o que já foi calculado em resumirLastro. Zero conta nova.
export default function PoderSegurancaGrid({ resumo: r }) {
  if (!r) return null;

  const cartoes = [
    {
      valor: vezes(r.coberturaRepasse),
      titulo: 'Folga de pagamento',
      texto: `Reserva de ${brl(r.orcamentoParceiros)} para um repasse de ${brl(r.repasse)}.`,
    },
    {
      valor: vezes(r.multiploLastro),
      titulo: 'Lastro em mercadoria',
      texto: `${brl(r.capital)} de capital com ${brl(r.lastro)} em bem físico.`,
    },
    {
      valor: brl(r.lucro),
      titulo: 'Sobra depois de tudo',
      texto: 'O repasse já está dentro da conta. Isso é o que resta.',
    },
  ];

  return (
    <div className="mt-4">
      <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-pc-ouro">
        <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={1.8} /> Poder de segurança
      </p>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cartoes.map((c) => (
          <div key={c.titulo} className="border border-pc-borda bg-pc-preto-2 p-3 text-center">
            <p className="break-words text-2xl font-black leading-tight text-pc-ouro">{c.valor}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-pc-tinta">
              {c.titulo}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-pc-tinta-fraca">{c.texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}