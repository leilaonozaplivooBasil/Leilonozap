import React from "react";
import { MapPin } from "lucide-react";

/**
 * CatalogInternalHeader — header interno da Loja Virtual.
 *
 * Layout minimalista: [ 📍 Enviar para: X ]  •  [ Loja Virtual • Online ]
 *
 * A navegação entre painéis do usuário é feita EXCLUSIVAMENTE pelo dropdown
 * do avatar no canto superior direito (NavDesktop). Não há mais botão
 * "⋮ Painéis" duplicado aqui — fonte única de navegação.
 */
export default function CatalogInternalHeader({ licenseeData }) {
  // Região de entrega: usa cidade do licenciado se disponível, senão "Brasil"
  const deliveryRegion = licenseeData?.city ? licenseeData.city : "Brasil";

  return (
    <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3 py-3 border-b border-gray-800/60">
      <div className="flex items-center gap-1.5 text-gray-400 min-w-0">
        <MapPin className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs sm:text-sm truncate">
          Enviar para: <span className="text-white font-semibold">{deliveryRegion}</span>
        </span>
      </div>

      <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-500">
        <span className="hidden sm:inline">Loja Virtual</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold text-emerald-400">Online</span>
      </div>
    </div>
  );
}
