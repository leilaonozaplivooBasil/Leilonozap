import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

// ✅ Comprovação visual do aporte confirmado — o parceiro precisa VER que o
// dinheiro chegou, com plano, valor e horário, antes do modal fechar.
//
// ⚠️ Só apresentação. A confirmação vem do servidor (checkPartnerPlanPayment).
export default function ParceiroPixConfirmado({ plano, valor, onConcluir }) {
  const agora = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="space-y-5 py-2 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-pc-ouro" strokeWidth={1.5} />
      <div>
        <h3 className="text-xl font-bold text-pc-tinta">Aporte confirmado</h3>
        <p className="mt-1 text-sm text-pc-tinta-fraca">
          Recebemos seu PIX e o plano já está ativo na operação.
        </p>
      </div>

      <dl className="mx-auto max-w-sm border border-pc-borda bg-pc-preto-2 text-left">
        {[
          ['Plano', plano || '-'],
          ['Valor do aporte', `R$ ${(valor || 0).toLocaleString('pt-BR')}`],
          ['Confirmado em', agora],
        ].map(([rotulo, texto]) => (
          <div key={rotulo} className="flex items-center justify-between gap-3 border-b border-pc-borda px-4 py-3 last:border-b-0">
            <dt className="text-[9px] font-semibold uppercase tracking-[0.15em] text-pc-tinta-fraca">{rotulo}</dt>
            <dd className="text-right text-sm font-semibold text-pc-tinta">{texto}</dd>
          </div>
        ))}
      </dl>

      <p className="text-[11px] leading-relaxed text-pc-tinta-fraca">
        Acompanhe cada etapa em <span className="text-pc-ouro">Linha do tempo</span> e os
        resultados apurados em <span className="text-pc-ouro">Prestação de contas</span>.
      </p>

      <Button
        onClick={onConcluir}
        className="min-h-[48px] w-full bg-pc-ouro font-semibold text-pc-preto hover:bg-pc-ouro-claro"
      >
        Ir para o meu painel
      </Button>
    </div>
  );
}