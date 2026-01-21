import React from "react";
import { Badge } from "@/components/ui/badge";

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
}

export default function LicenseeListItem({ licensee, selected, onSelect }) {
  const isActive = (licensee.career_levels || []).includes("licenciado_catalogo");
  const referral = licensee.referral_code || "";
  const link = `https://leilaonozap.app/catalog?ref=${referral}`;

  return (
    <button
      onClick={() => onSelect?.(licensee)}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
        selected ? "bg-gray-800 border-green-500/40" : "bg-gray-900 border-gray-800 hover:border-gray-700"
      }`}
    >
      <div className="flex items-center gap-3">
        {licensee.avatar_url ? (
          <img src={licensee.avatar_url} alt={licensee.full_name} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-green-600/20 text-green-400 font-semibold flex items-center justify-center">
            {initials(licensee.full_name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-white truncate">{licensee.full_name}</p>
            <Badge className={isActive ? "bg-green-600/20 text-green-400" : "bg-yellow-600/20 text-yellow-400"}>
              {isActive ? "Catálogo ativo" : "Configurar catálogo"}
            </Badge>
          </div>
          <p className="text-xs text-gray-400 truncate">{link}</p>
        </div>
      </div>
    </button>
  );
}