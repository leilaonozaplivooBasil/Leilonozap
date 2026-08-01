import React from 'react';
import { ShieldCheck } from 'lucide-react';

// Aviso legal do Passaporte — ênfase maior (pedido do Gabriel) e alinhado ao
// Termo de Adesão: as disputas são COMPETIÇÃO DE PREÇOS, não leilão oficial.
export default function AvisoLegalPassaporte() {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-5">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-emerald-300" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Aviso importante</p>
      </div>
      <p className="text-sm text-white/75 leading-relaxed">
        O valor pago no Passaporte de Lances <b className="text-white">não constitui depósito bancário, pagamento
        por sorte ou aposta</b>. Trata-se de <b className="text-white">antecipação de crédito para consumo</b> dentro
        do ecossistema Leilão NoZap, podendo ser integralmente utilizado na aquisição de produtos — seja nas
        disputas da plataforma ou na Loja Virtual.
      </p>
      <p className="mt-3 text-sm text-white/75 leading-relaxed">
        As disputas do Leilão NoZap são uma <b className="text-white">competição de preços de caráter promocional</b>,
        e <b className="text-white">não</b> um leilão oficial nos termos do Decreto nº 21.981/32. Não há leiloeiro
        público oficial envolvido.
      </p>
      <p className="mt-3 text-sm text-white/75 leading-relaxed">
        O valor é <b className="text-white">irrestornável</b> após a confirmação do pagamento, salvo falha técnica
        comprovada da plataforma (art. 18 do CDC). O uso do crédito é exclusivo dentro do ecossistema.
      </p>
    </div>
  );
}