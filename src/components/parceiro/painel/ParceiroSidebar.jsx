import React from 'react';
import { Lock } from 'lucide-react';

// 🧭 Menu LATERAL do Painel do Parceiro (padrão Painel de Alavancagem / Mercado Pago).
// Desktop/tablet: coluna vertical fixa de 116px (nome completo em até 2 linhas,
// sem cortar), sticky no scroll.
// Mobile (<md): barra inferior fixa, horizontal e rolável.
// Paleta exclusiva --pc- (preto/dourado). Alvos de toque >= 44x44.
export default function ParceiroSidebar({ telas, telaAtiva, onSelecionar }) {
  const Item = ({ t }) => {
    const ativa = t.id === telaAtiva;
    const bloqueada = !!t.bloqueada;
    const Icone = t.icone;
    return (
      <button
        type="button"
        aria-current={ativa ? 'page' : undefined}
        aria-label={t.rotulo}
        onClick={() => onSelecionar(t.id)}
        className={`relative flex min-h-[56px] w-[68px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg px-1 py-2 transition-colors md:min-h-[76px] md:w-full md:px-2 md:py-3 ${
          ativa ? 'bg-pc-preto-2 text-pc-ouro' : 'text-pc-tinta-fraca hover:text-pc-tinta'
        } ${bloqueada ? 'opacity-50' : ''}`}
      >
        {ativa && (
          <span
            aria-hidden="true"
            className="absolute left-0 top-1/2 hidden h-7 w-[3px] -translate-y-1/2 rounded-r bg-pc-ouro md:block"
          />
        )}
        {ativa && (
          <span
            aria-hidden="true"
            className="absolute inset-x-2 top-0 block h-[3px] rounded-b bg-pc-ouro md:hidden"
          />
        )}
        <span className="relative">
          <Icone className="h-6 w-6" strokeWidth={1.6} />
          {bloqueada && (
            <Lock
              className="absolute -bottom-0.5 -right-1 h-3 w-3 rounded-full bg-pc-preto text-pc-tinta-fraca"
              strokeWidth={2.2}
            />
          )}
        </span>
        {/* 📱 mobile: rótulo curto (não estoura a barra inferior) */}
        <span className="w-full text-center text-[9px] font-semibold uppercase leading-tight tracking-wide md:hidden">
          {t.rotuloCurto}
        </span>
        {/* 💻 desktop: nome COMPLETO, em até 2 linhas, sem cortar nem truncar */}
        <span className="hidden w-full break-words text-center text-[10px] font-semibold uppercase leading-[1.15] tracking-[0.01em] md:block">
          {t.rotulo}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* 💻 Desktop / tablet — coluna vertical sticky */}
      <nav
        aria-label="Telas do painel do parceiro"
        className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[116px] shrink-0 flex-col gap-2 overflow-y-auto border-r border-pc-borda bg-pc-preto px-2 py-4 nz-no-scrollbar md:flex"
      >
        {telas.map((t) => (
          <Item key={t.id} t={t} />
        ))}
      </nav>

      {/* 📱 Mobile — barra inferior fixa, rolável, sem scroll lateral na página */}
      <nav
        aria-label="Telas do painel do parceiro"
        className="fixed bottom-0 left-0 right-0 z-40 flex max-w-full gap-1 overflow-x-auto border-t border-pc-borda bg-pc-preto px-2 pt-1 nz-no-scrollbar md:hidden"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.25rem)' }}
      >
        {telas.map((t) => (
          <Item key={t.id} t={t} />
        ))}
      </nav>
    </>
  );
}