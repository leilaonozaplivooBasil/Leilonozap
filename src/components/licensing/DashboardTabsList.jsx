import React from 'react';
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, ShoppingBag, Award, Shield } from 'lucide-react';

const TAB_ITEMS = [
  { value: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard, show: () => true },
  { value: 'catalogo', label: 'Central de Vendas', icon: ShoppingBag, show: (ctx) => ctx.userLevels.includes('licenciado_catalogo') || ctx.isAdmin },
  { value: 'plano-carreira', label: 'Carreira', icon: Award, show: () => true },
  { value: 'admin', label: 'Admin', icon: Shield, show: (ctx) => ctx.isAdmin },
];

export default function DashboardTabsList({ isSaiDeBaixo, userLevels, isAdmin, myClientsCount }) {
  const ctx = { userLevels, isAdmin, myClientsCount };

  return (
    <div className={`rounded-xl border p-1.5 shadow-lg bg-gradient-to-r from-gray-900 ${isSaiDeBaixo ? 'via-red-950/10 border-red-500/20' : 'via-emerald-950/10 border-emerald-500/20'} to-gray-900`}>
      <TabsList className="bg-transparent border-0 h-auto p-0 flex flex-nowrap overflow-x-auto gap-1 justify-start">
        {TAB_ITEMS.filter((item) => item.show(ctx)).map((item) => {
          const Icon = item.icon;
          const label = typeof item.label === 'function' ? item.label(ctx) : item.label;
          return (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className={`shrink-0 flex items-center gap-1.5 text-xs sm:text-sm font-medium whitespace-nowrap rounded-lg px-3 sm:px-4 py-2.5 text-gray-400 transition-all ${isSaiDeBaixo ? 'data-[state=active]:bg-red-600' : 'data-[state=active]:bg-emerald-600'} data-[state=active]:text-white data-[state=active]:shadow-md hover:text-white`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </div>
  );
}