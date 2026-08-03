import React from 'react';
import { LayoutDashboard, ShoppingBag, Award, Shield, Store } from 'lucide-react';

// 🧭 Rail vertical de ícones (estilo Mercado Pago) — substitui a barra de
// pílulas no topo. Controlado externamente via activeTab/onTabChange, sem
// depender do TabsList do Radix.
const TAB_ITEMS = [
  { value: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard, show: () => true },
  { value: 'catalogo', label: 'Central de Vendas', icon: ShoppingBag, show: (ctx) => ctx.userLevels.includes('licenciado') || ctx.isAdmin },
  { value: 'minha-loja', label: 'Minha Loja', icon: Store, show: (ctx) => (ctx.userLevels.includes('licenciado') || ctx.isSeller) && !ctx.isAdmin },
  { value: 'plano-carreira', label: 'Carreira', icon: Award, show: () => true },
  { value: 'admin', label: 'Admin', icon: Shield, show: (ctx) => ctx.isAdmin },
];

export default function LicensingSidebar({ user, shortName, activeTab, onTabChange, userLevels, isAdmin, isSeller }) {
  const ctx = { userLevels, isAdmin, isSeller };
  const initials = (shortName || '?').trim().split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <aside className="hidden md:flex flex-col items-center w-20 shrink-0 bg-white border-r border-gray-200 py-5 gap-1 sticky top-0 h-screen overflow-y-auto">
      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm mb-1 overflow-hidden shrink-0">
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt={shortName} className="w-full h-full object-cover" />
        ) : (initials || '?')}
      </div>
      <p className="text-[10px] font-medium text-gray-500 text-center leading-tight mb-4 px-1 truncate w-full">{shortName}</p>

      <nav className="flex flex-col gap-1 w-full px-2">
        {TAB_ITEMS.filter((item) => item.show(ctx)).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.value;
          return (
            <button
              key={item.value}
              type="button"
              title={item.label}
              onClick={() => onTabChange(item.value)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-colors ${active ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
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