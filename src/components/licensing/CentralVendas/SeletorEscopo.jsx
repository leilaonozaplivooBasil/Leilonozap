import React, { useState } from 'react';
import { User, ShieldCheck } from 'lucide-react';
import { lerEscopo, gravarEscopo, resolverEscopo } from '@/lib/escopoDeVisao';

// 👤/🛡️ O SELETOR DO ESCOPO — "só o meu" ou "tudo" (dono, 06/09/2026):
// "preciso ter uma comunicação melhor pra falar comigo como super admin —
// você está vendo como usuário normal e também como super admin, está
// confundindo". Um seletor só, no topo, guardado no aparelho; a página
// inteira obedece (escopoDeVisao.js). Só aparece pra quem tem visão total.

/** A escolha guardada no aparelho, como estado do React. */
export function useEscopoDeVisao() {
  const [escopo, setEscopo] = useState(() => lerEscopo());
  const trocar = (v) => setEscopo(gravarEscopo(v));
  return [escopo, trocar];
}

export default function SeletorEscopo({ vis, escopo, onEscopo, className = '' }) {
  const r = resolverEscopo({ vis, escopo });
  if (!r.podeTudo) return null;
  const opcao = (id, Icone, rotulo) => {
    const ativo = r.escopo === id;
    return (
      <button type="button" onClick={() => onEscopo(id)} aria-pressed={ativo} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${ativo ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`} data-teste={`escopo-${id}`}>
        <Icone className="w-3.5 h-3.5" /> {rotulo}
      </button>
    );
  };
  return (
    <div className={`flex flex-col items-start sm:items-end gap-1 ${className}`} data-teste="escopo-visao" data-escopo={r.escopo}>
      <div className="inline-flex items-center gap-0.5 rounded-full border border-white/15 bg-white/[0.04] p-0.5">
        {opcao('eu', User, 'Só o meu')}
        {opcao('tudo', ShieldCheck, `Tudo · ${vis.papelLabel}`)}
      </div>
      <p className={`text-[11px] ${r.tudo ? 'text-amber-200/90' : 'text-white/45'}`} data-teste="escopo-explicacao">
        {r.tudo ? <ShieldCheck className="w-3 h-3 inline mr-1" /> : <User className="w-3 h-3 inline mr-1" />}
        Você está vendo: <span className="font-bold">{r.rotulo}</span>
      </p>
    </div>
  );
}
