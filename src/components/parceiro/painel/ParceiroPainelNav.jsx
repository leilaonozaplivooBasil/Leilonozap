import React from 'react';
import { Lock } from 'lucide-react';

// 🧭 Navegação "tela a tela" do Painel do Parceiro (padrão do Painel de Alavancagem).
// Rolagem horizontal no mobile, alvos de toque >= 44px, tokens --pc- apenas.
export default function ParceiroPainelNav({ telas, telaAtiva, onSelecionar }) {
  return (
    <nav
      aria-label="Telas do painel do parceiro"
      className="-mx-3 mb-8 overflow-x-auto border-b border-pc-borda px-3 nz-no-scrollbar sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max items-stretch gap-1">
        {telas.map((t) => {
          const ativa = t.id === telaAtiva;
          const bloqueada = !!t.bloqueada;
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-current={ativa ? 'page' : undefined}
                onClick={() => onSelecionar(t.id)}
                className={`flex min-h-[48px] items-center gap-2 whitespace-nowrap border-b-2 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                  ativa
                    ? 'border-pc-ouro text-pc-ouro'
                    : 'border-transparent text-pc-tinta-fraca hover:text-pc-tinta'
                }`}
              >
                {bloqueada && <Lock className="h-3.5 w-3.5" strokeWidth={1.8} />}
                {t.rotulo}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}