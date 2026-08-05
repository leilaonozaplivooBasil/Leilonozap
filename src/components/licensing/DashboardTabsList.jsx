import React from 'react';
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LICENSING_TABS } from '@/lib/licensingTabs';

// 📱 Barra de abas do mobile do Painel de Alavancagem.
// PONTO 85: mesma fonte única do rail do desktop (@/lib/licensingTabs) — os 4
// itens aparecem para TODOS. A lista rola na horizontal, então cabe até em 320px.
export default function DashboardTabsList() {
  return (
    <div className="rounded-xl border border-nz-borda p-1.5 shadow-sm bg-white">
      <TabsList className="bg-transparent border-0 h-auto p-0 flex flex-nowrap overflow-x-auto gap-1 justify-start">
        {LICENSING_TABS.map((item) => {
          const Icon = item.icon;
          return (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="shrink-0 flex items-center gap-1.5 text-xs sm:text-sm font-medium whitespace-nowrap rounded-lg px-3 sm:px-4 py-2.5 text-gray-500 transition-all data-[state=active]:bg-nz-verde-fundo data-[state=active]:text-nz-verde hover:text-nz-verde">
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </div>
  );
}