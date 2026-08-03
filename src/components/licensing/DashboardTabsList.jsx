import React from 'react';
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, ShoppingBag, Award, Shield, Store } from 'lucide-react';

const TAB_ITEMS = [
  { value: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard, show: () => true },
  { value: 'catalogo', label: 'Central de Vendas', icon: ShoppingBag, show: (ctx) => ctx.userLevels.includes('licenciado') || ctx.isAdmin },
  { value: 'minha-loja', label: 'Minha Loja', icon: Store, show: (ctx) => (ctx.userLevels.includes('licenciado') || ctx.isSeller) && !ctx.isAdmin },
  { value: 'plano-carreira', label: 'Carreira', icon: Award, show: () => true },
  { value: 'admin', label: 'Admin', icon: Shield, show: (ctx) => ctx.isAdmin },
];

export default function DashboardTabsList({ isSaiDeBaixo, userLevels, isAdmin, isSeller, myClientsCount }) {
  const ctx = { userLevels, isAdmin, isSeller, myClientsCount };

  return (
    <div className="rounded-xl border border-nz-borda p-1.5 shadow-sm bg-white">
      <TabsList className="bg-transparent border-0 h-auto p-0 flex flex-nowrap overflow-x-auto gap-1 justify-start">
        {TAB_ITEMS.filter((item) => item.show(ctx)).map((item) => {
          const Icon = item.icon;
          const label = typeof item.label === 'function' ? item.label(ctx) : item.label;
          return (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="shrink-0 flex items-center gap-1.5 text-xs sm:text-sm font-medium whitespace-nowrap rounded-lg px-3 sm:px-4 py-2.5 text-gray-500 transition-all data-[state=active]:bg-nz-verde-fundo data-[state=active]:text-nz-verde hover:text-nz-verde">
              <Icon className="w-3.5 h-3.5" />
              {label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </div>
  );
}