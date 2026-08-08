import React from 'react';
import { Link } from 'react-router-dom';
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LICENSING_TABS, getLicensingGroups } from '@/lib/licensingTabs';

// 📱 Barra de abas do mobile do Painel de Alavancagem.
// PONTO 85: mesma fonte única do rail do desktop (@/lib/licensingTabs) — os 4
// itens aparecem para TODOS. A lista rola na horizontal, então cabe até em 320px.
// FASE 2: depois das 4 abas entram os ATALHOS (links) para as rotas que já
// existem — mesma fonte única do desktop, sem títulos de grupo (não cabe no
// celular). O usuário é lido do localStorage porque a barra é montada sem props.
export default function DashboardTabsList() {
  const user = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { return null; }
  }, []);

  const atalhos = React.useMemo(
    () => getLicensingGroups(user).flatMap((g) => g.items).filter((i) => i.type === 'link'),
    [user]
  );

  return (
    <div className="rounded-xl border border-nz-borda p-1.5 shadow-sm bg-white">
      <div className="flex flex-nowrap overflow-x-auto gap-1 items-center nz-no-scrollbar">
        <TabsList className="bg-transparent border-0 h-auto p-0 flex flex-nowrap gap-1 justify-start shrink-0">
          {LICENSING_TABS.map((item) => {
            const Icon = item.icon;
            return (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="shrink-0 flex items-center gap-1.5 text-xs sm:text-sm font-medium whitespace-nowrap rounded-lg px-3 sm:px-4 py-2.5 min-h-[44px] text-gray-500 transition-all data-[state=active]:bg-nz-verde-fundo data-[state=active]:text-nz-verde hover:text-nz-verde">
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {atalhos.length > 0 && <span className="shrink-0 w-px h-6 bg-nz-borda mx-1" />}

        {atalhos.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 flex items-center gap-1.5 text-xs sm:text-sm font-medium whitespace-nowrap rounded-lg px-3 sm:px-4 py-2.5 min-h-[44px] text-gray-500 border border-nz-marrom/15 hover:bg-nz-marrom-fundo/40 hover:text-nz-verde">
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}