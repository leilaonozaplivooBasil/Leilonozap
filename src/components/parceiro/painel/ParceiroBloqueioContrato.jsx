import React from 'react';
import { FileSignature, Lock } from 'lucide-react';

// 🔒 Tela de bloqueio das áreas FINANCEIRAS do painel (Linha do tempo e
// Prestação de contas). Elas só abrem depois do aceite eletrônico do
// Contrato de Parceria — antes disso não existe aporte para acompanhar.
//
// ⚠️ Só apresentação. Quem decide se está liberado é a página (InvestorDashboard),
// que lê a assinatura no servidor.
export default function ParceiroBloqueioContrato({ titulo, texto, onIrParaContrato }) {
  return (
    <section className="border border-pc-borda bg-pc-preto-2 p-6 sm:p-10">
      <span className="inline-flex items-center gap-1.5 border border-pc-borda px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-pc-tinta-fraca">
        <Lock className="h-3 w-3" strokeWidth={2} /> Liberado após o contrato
      </span>

      <FileSignature className="mt-5 h-8 w-8 text-pc-ouro" strokeWidth={1.4} />
      <h2 className="mt-3 text-xl font-bold text-pc-tinta sm:text-2xl">{titulo}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pc-tinta-fraca">{texto}</p>

      <p className="mt-5 max-w-2xl border border-pc-ouro/40 bg-pc-preto px-4 py-3 text-[12px] leading-relaxed text-pc-ouro">
        Esta área acompanha o seu capital na operação. Ela é liberada com o aceite
        eletrônico do Contrato de Parceria Comercial (Lei nº 14.063/2020 e MP nº 2.200-2/2001).
      </p>

      <button
        type="button"
        onClick={onIrParaContrato}
        className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 border border-pc-ouro px-6 text-[11px] font-semibold uppercase tracking-[0.15em] text-pc-ouro transition-colors hover:bg-pc-ouro hover:text-pc-preto sm:w-auto"
      >
        <FileSignature className="h-4 w-4" strokeWidth={2} />
        Ir para contrato e plano
      </button>
    </section>
  );
}