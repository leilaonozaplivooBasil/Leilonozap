import React from 'react';
import { ShieldCheck, Truck, Lock, Gavel } from 'lucide-react';

// 🛡️ Faixa de confiança. Tudo aqui é afirmação que a operação sustenta hoje —
// selo é promessa pública, não decoração.
const SELOS = [
  { icone: ShieldCheck, titulo: 'Compra segura', linha: 'Seus dados protegidos' },
  { icone: Truck, titulo: 'Entrega em todo o Brasil', linha: 'Enviamos para todo o país' },
  { icone: Lock, titulo: 'Site protegido', linha: 'Conexão HTTPS em todas as páginas' },
  { icone: Gavel, titulo: 'Lance registrado', linha: 'Cada lance fica no histórico do leilão' },
];

export default function SelosDeConfianca() {
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-nz-noite-2 px-5 py-[clamp(32px,4vw,52px)]" data-teste="selos-de-confianca">
      {/* fio verde no topo: o mesmo da faixa de números, costurando as duas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(63,208,126,0.45), transparent)' }}
      />
      {/* 🛡️ 19/09/2026 — A FAIXA ERA UMA LINHA DE 106px QUE NINGUÉM VIA.
          Quatro ícones minúsculos num rodapé antes do rodapé. Promessa pública
          escrita em corpo 12 cinza não tranquiliza ninguém — vira letra miúda.
          Agora cada selo é um cartão, com o mesmo repouso e a mesma reação ao
          mouse do resto da página. */}
      <div className="mx-auto grid max-w-[1200px] gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SELOS.map((s) => (
          <div
            key={s.titulo}
            className="group flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-nz-verde-claro/45 hover:bg-white/[0.06] hover:shadow-[0_16px_34px_-20px_rgba(46,157,99,0.6)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            data-teste="selo-de-confianca"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-nz-verde-claro/25 bg-nz-verde-claro/10 transition-colors duration-300 group-hover:border-nz-verde-neon/60 group-hover:bg-nz-verde-claro/20">
              <s.icone size={18} className="text-nz-verde-neon" />
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold leading-tight text-white">{s.titulo}</div>
              <div className="mt-1 text-[12px] leading-snug text-white/55">{s.linha}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
