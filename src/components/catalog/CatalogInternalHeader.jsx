import React, { useState } from "react";
import { MoreVertical, MapPin } from "lucide-react";
import { resolveUserPanels } from "@/lib/panelResolver";
import CatalogPanelsDrawer from "./CatalogPanelsDrawer";

/**
 * CatalogInternalHeader — header interno da Loja Virtual.
 * Substitui a antiga barra horizontal de painéis coloridos.
 *
 * Layout: [ ⋮ (drawer painéis) ]  •  [ 📍 Enviar para: X ]  •  [ direita livre ]
 *
 * Só mostra o botão ⋮ se o usuário tem 2+ painéis disponíveis.
 * (usuários comuns visitantes NÃO veem o ⋮ — nada muda pra eles)
 */
export default function CatalogInternalHeader({ currentUser, licenseeData }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const panels = resolveUserPanels(currentUser);
  const showDrawerButton = panels.length >= 2;

  // Região de entrega: usa cidade do licenciado se disponível, senão "Brasil"
  const deliveryRegion =
    licenseeData?.city
      ? licenseeData.city
      : "Brasil";

  return (
    <>
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3 py-3 border-b border-gray-800/60">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {showDrawerButton && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Trocar painel"
              title="Trocar painel"
              className="flex items-center gap-2 px-3 h-10 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80 border border-gray-700/60 hover:border-emerald-500/40 transition-all"
            >
              <MoreVertical className="w-5 h-5" />
              <span className="text-xs font-semibold hidden sm:inline">Painéis</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-gray-400 min-w-0">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm truncate">
              Enviar para: <span className="text-white font-semibold">{deliveryRegion}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-500">
          <span className="hidden sm:inline">Loja Virtual</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-emerald-400">Online</span>
        </div>
      </div>

      <CatalogPanelsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentUser={currentUser}
      />
    </>
  );
}