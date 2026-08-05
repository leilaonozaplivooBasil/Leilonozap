import React from 'react';
import { LICENSING_TABS } from '@/lib/licensingTabs';

// 🧭 Rail vertical de ícones (estilo Mercado Pago) — substitui a barra de
// pílulas no topo. Controlado externamente via activeTab/onTabChange, sem
// depender do TabsList do Radix.
// PONTO 85: a lista de itens vem de @/lib/licensingTabs (fonte única) e os 4
// itens aparecem para TODOS — nada de filtro por cargo aqui.
export default function LicensingSidebar({ user, shortName, activeTab, onTabChange }) {
  const initials = (shortName || '?').trim().split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <aside className="hidden md:flex flex-col items-center w-20 shrink-0 bg-white border-r border-gray-200 py-5 gap-1 sticky top-0 h-screen overflow-y-auto">
      <div className="w-10 h-10 rounded-full bg-nz-verde text-white flex items-center justify-center font-bold text-sm mb-1 overflow-hidden shrink-0">
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt={shortName} className="w-full h-full object-cover" />
        ) : (initials || '?')}
      </div>
      <p className="text-[10px] font-medium text-gray-500 text-center leading-tight mb-4 px-1 truncate w-full">{shortName}</p>

      <nav className="flex flex-col gap-1 w-full px-2">
        {LICENSING_TABS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.value;
          return (
            <button
              key={item.value}
              type="button"
              title={item.label}
              onClick={() => onTabChange(item.value)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-colors ${active ? 'bg-nz-verde-fundo text-nz-verde border-nz-verde/30' : 'text-gray-400 border-nz-marrom/15 hover:bg-nz-marrom-fundo/40 hover:text-gray-600'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium leading-none text-center px-1">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}