import React from "react";
import { Badge } from "@/components/ui/badge";
import { Link2, Copy, Edit, ExternalLink } from "lucide-react";

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
}

export default function LicenseeListItem({ licensee, selected, onSelect, onEdit }) {
  const isActive = (licensee.career_levels || []).includes("licenciado_catalogo");
  const referral = licensee.referral_code || "";
  const link = `https://leilaonozap.app/catalog?ref=${referral}`;

  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link);
  };
  const open = (e) => {
    e.stopPropagation();
    window.open(link, "_blank");
  };

  return (
    <button
      onClick={() => onSelect?.(licensee)}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all shadow-sm ${
                    selected ? "bg-gray-700/60 border-green-500/40" : "bg-gray-800 border-gray-700 hover:border-gray-600"
                  }`}
    >
      <div className="flex items-center gap-3">
        {licensee.avatar_url ? (
          <img src={licensee.avatar_url} alt={licensee.full_name} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-green-500/20 text-green-400 font-semibold flex items-center justify-center">
            {initials(licensee.full_name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white truncate">{licensee.full_name}</p>
          <div className="text-xs text-gray-400 truncate flex items-center gap-1">
            <Link2 className="w-3.5 h-3.5" /> {link}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span title="Copiar link" onClick={copy} className="h-8 w-8 rounded-full bg-gray-700/60 text-white hover:text-green-400 grid place-items-center cursor-pointer">
            <Copy className="w-4 h-4" />
          </span>
          <span title="Abrir" onClick={open} className="h-8 w-8 rounded-full bg-gray-700/60 text-white hover:text-green-400 grid place-items-center cursor-pointer">
            <ExternalLink className="w-4 h-4" />
          </span>
          <span title="Editar" onClick={(e)=>{ e.stopPropagation(); onEdit?.(licensee); }} className="h-8 w-8 rounded-full bg-gray-700/60 text-white hover:text-green-400 grid place-items-center cursor-pointer">
            <Edit className="w-4 h-4" />
          </span>
        </div>
        <div className="ml-2">
          <Badge className={isActive ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-300"}>
            {isActive ? "Catálogo ativo" : "Catálogo inativo"}
          </Badge>
        </div>
      </div>
    </button>
  );
}