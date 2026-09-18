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
    <section className="border-y border-white/10 bg-[#07100C] px-5 py-8" data-teste="selos-de-confianca">
      <div className="mx-auto grid max-w-[1200px] gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {SELOS.map((s) => (
          <div key={s.titulo} className="flex items-start gap-3">
            <s.icone size={20} className="mt-0.5 flex-none text-nz-verde-claro" />
            <div>
              <div className="text-[14px] font-medium text-white">{s.titulo}</div>
              <div className="mt-0.5 text-[12px] leading-snug text-white/50">{s.linha}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
