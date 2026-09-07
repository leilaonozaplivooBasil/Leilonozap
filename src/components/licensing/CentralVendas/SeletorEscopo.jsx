import React, { useEffect, useState } from 'react';
import { User, ShieldCheck } from 'lucide-react';
import { lerEscopo, gravarEscopo, resolverEscopo } from '@/lib/escopoDeVisao';

// 👤/🛡️ O SELETOR DO ESCOPO — "só o meu" ou "tudo" (dono, 06/09/2026):
// "preciso ter uma comunicação melhor pra falar comigo como super admin —
// você está vendo como usuário normal e também como super admin, está
// confundindo". Um seletor só, guardado no aparelho; a página inteira obedece
// (escopoDeVisao.js). Só aparece pra quem tem visão total.
//
// 07/09 — "todas as abas têm que ter esse botão, bem pequeno, bem bonitinho".
// Então ele mora UMA vez no topo da página (junto do seletor de seções da Top
// College), na versão `compacto`, e TODOS os usos do hook ficam sincronizados:
// trocar aqui troca em todo componente que estiver ouvindo.

const ouvintes = new Set();

/** A escolha guardada no aparelho, como estado do React — sincronizada entre todos que a usam. */
export function useEscopoDeVisao() {
  const [escopo, setEscopo] = useState(() => lerEscopo());
  useEffect(() => { ouvintes.add(setEscopo); return () => { ouvintes.delete(setEscopo); }; }, []);
  const trocar = (v) => { const n = gravarEscopo(v); ouvintes.forEach((f) => f(n)); };
  return [escopo, trocar];
}

export default function SeletorEscopo({ vis, escopo, onEscopo, compacto = false, className = '' }) {
  const r = resolverEscopo({ vis, escopo });
  if (!r.podeTudo) return null;
  const opcao = (id, Icone, rotulo) => {
    const ativo = r.escopo === id;
    return (
      <button type="button" onClick={() => onEscopo(id)} aria-pressed={ativo} title={id === 'tudo' ? `Ver tudo, como ${vis.papelLabel}` : 'Ver só o que é seu, como usuário'}
        className={`inline-flex items-center gap-1 rounded-full font-bold transition-colors ${compacto ? 'px-2 py-0.5 text-[10.5px]' : 'px-3 py-1.5 text-[12px]'} ${ativo ? (id === 'tudo' ? 'bg-amber-300 text-black' : 'bg-white text-black') : 'text-white/55 hover:text-white'}`} data-teste={`escopo-${id}`}>
        <Icone className={compacto ? 'w-3 h-3' : 'w-3.5 h-3.5'} /> {rotulo}
      </button>
    );
  };
  return (
    <div className={`flex ${compacto ? 'flex-row items-center gap-2' : 'flex-col items-start sm:items-end gap-1'} ${className}`} data-teste="escopo-visao" data-escopo={r.escopo}>
      <div className="inline-flex items-center gap-0.5 rounded-full border border-white/15 bg-white/[0.04] p-0.5">
        {opcao('eu', User, 'Só o meu')}
        {opcao('tudo', ShieldCheck, compacto ? 'Tudo' : `Tudo · ${vis.papelLabel}`)}
      </div>
      {!compacto && (
        <p className={`text-[11px] ${r.tudo ? 'text-amber-200/90' : 'text-white/45'}`} data-teste="escopo-explicacao">
          {r.tudo ? <ShieldCheck className="w-3 h-3 inline mr-1" /> : <User className="w-3 h-3 inline mr-1" />}
          Você está vendo: <span className="font-bold">{r.rotulo}</span>
        </p>
      )}
    </div>
  );
}
