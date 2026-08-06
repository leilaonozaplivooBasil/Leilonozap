import React from 'react';
import { PREAMBULO, SECOES } from '@/lib/termoSigiloTexto';

// 📜 Só o texto do Termo de Confidencialidade (conteúdo, sem lógica).
export default function ParceiroTermoSigiloTexto() {
  return (
    <div className="space-y-5 text-[13px] leading-relaxed text-pc-tinta-fraca">
      <p className="text-justify">{PREAMBULO}</p>
      {SECOES.map(([titulo, ...paragrafos]) => (
        <section key={titulo} className="space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-pc-ouro">{titulo}</h4>
          {paragrafos.map((p, i) => (
            <p key={i} className="text-justify">{p}</p>
          ))}
        </section>
      ))}
    </div>
  );
}