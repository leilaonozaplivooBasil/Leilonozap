import React from 'react';
import { getLicensingGroups } from '@/lib/licensingTabs';
import LicensingNavItem from './LicensingNavItem';

// 🧭 Rail vertical de ícones (estilo Mercado Pago) — substitui a barra de
// pílulas no topo. Controlado externamente via activeTab/onTabChange, sem
// depender do TabsList do Radix.
// PONTO 85: os itens vêm de @/lib/licensingTabs (fonte única).
// FASE 2: o rail passa a ser o ÍNDICE ÚNICO — grupos com título, abas internas
// e links para as rotas que já existem. As 4 abas originais seguem intactas.
export default function LicensingSidebar({ user, shortName, activeTab, onTabChange }) {
  const initials = (shortName || '?').trim().split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const grupos = getLicensingGroups(user);

  return (
    <aside
      className="hidden md:flex flex-col items-center w-24 shrink-0 bg-nz-preto-barra border-r border-black/40 py-5 gap-1 sticky overflow-y-auto"
      style={{ top: 64, height: 'calc(100vh - 64px)' }}
    >
      <div className="w-10 h-10 rounded-full bg-nz-verde text-white flex items-center justify-center font-bold text-sm mb-1 overflow-hidden shrink-0">
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt={shortName} className="w-full h-full object-cover" />
        ) : (initials || '?')}
      </div>
      <p className="text-[10px] font-medium text-white/60 text-center leading-tight mb-3 px-1 truncate w-full">{shortName}</p>

      <nav className="flex flex-col gap-3 w-full px-2 pb-12">
        {grupos.map((grupo) => (
          <div key={grupo.title} className="flex flex-col gap-1 pt-3 first:pt-0">
            <p className="text-[8px] font-bold uppercase tracking-wider text-white/40 text-center mb-1">{grupo.title}</p>
            {grupo.items.map((item) => (
              <LicensingNavItem
                key={item.value || item.to}
                item={item}
                active={item.type === 'tab' && activeTab === item.value}
                onSelect={onTabChange}
              />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}