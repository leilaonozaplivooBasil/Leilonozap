import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getLicensingGroups } from '@/lib/licensingTabs';

// 🧭 NAVEGAÇÃO LATERAL ÚNICA DO SISTEMA (08/08/2026 — decisão do dono).
// O botão "Voltar" foi retirado de todas as telas; no lugar dele entra ESTA
// lateral de ícones, a MESMA do Painel de Alavancagem (mesma fonte de itens:
// @/lib/licensingTabs), agora presente em todas as telas internas.
//
// Só desenha para quem está logado e só no desktop (no celular a saída já é o
// menu do topo, e uma coluna fixa comeria a tela).
// Itens de aba abrem o painel na aba certa (/Licensing?tab=…); itens de link
// vão para a rota que já existe. Nenhuma regra de permissão nova.
export default function NavegacaoLateralGlobal({ user }) {
  const location = useLocation();
  if (!user?.email) return null;

  const grupos = getLicensingGroups(user);
  const destinoDe = (item) => (item.type === 'tab' ? `/Licensing?tab=${item.value}` : item.to);

  return (
    // 🖤 Faixa escura em toda a altura do conteúdo; o menu segue fixo dentro dela.
    <aside className="hidden md:block w-24 shrink-0 self-stretch bg-nz-preto-barra border-r border-black/40" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <div
        className="flex flex-col items-center py-4 gap-1 sticky overflow-y-auto"
        style={{ top: 64, maxHeight: 'calc(100vh - 64px)' }}
      >
      <nav className="flex flex-col gap-3 w-full px-2 pb-12">
        {grupos.map((grupo) => (
          <div key={grupo.title} className="flex flex-col gap-1 pt-3 first:pt-0">
            <p className="text-[8px] font-bold uppercase tracking-wider text-white/40 text-center mb-1">
              {grupo.title}
            </p>
            {grupo.items.map((item) => {
              const to = destinoDe(item);
              const ativo = location.pathname.toLowerCase() === (item.to || '').toLowerCase();
              const Icone = item.icon;
              return (
                <Link
                  key={item.value || item.to}
                  to={to}
                  title={item.label}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center transition-colors ${
                    ativo
                      ? 'bg-white/10 text-nz-verde-claro'
                      : 'text-white/70 hover:bg-white/10 hover:text-nz-verde-claro'
                  }`}
                >
                  {Icone && <Icone className="w-5 h-5" />}
                  <span className="text-[9px] font-medium leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      </div>
    </aside>
  );
}