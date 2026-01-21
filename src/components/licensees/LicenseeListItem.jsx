import React from "react";
import { Badge } from "@/components/ui/badge";
import { Link2, Copy, Edit, ExternalLink } from "lucide-react";

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
}

export default function LicenseeListItem({ licensee, selected, onSelect }) {
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
        selected ? "bg-sky-50 border-sky-200" : "bg-white border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-center gap-3">
        {licensee.avatar_url ? (
          <img src={licensee.avatar_url} alt={licensee.full_name} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center">
            {initials(licensee.full_name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 truncate">{licensee.full_name}</p>
          <div className="text-xs text-slate-500 truncate flex items-center gap-1">
            <Link2 className="w-3.5 h-3.5" /> {link}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span title="Copiar link" onClick={copy} className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 grid place-items-center cursor-pointer">
            <Copy className="w-4 h-4" />
          </span>
          <span title="Abrir" onClick={open} className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 grid place-items-center cursor-pointer">
            <ExternalLink className="w-4 h-4" />
          </span>
          <span title="Editar" className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 grid place-items-center">
            <Edit className="w-4 h-4" />
          </span>
        </div>
        <div className="ml-2">
          <Badge className={isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
            {isActive ? "Catálogo ativo" : "Catálogo inativo"}
          </Badge>
        </div>
      </div>
    </button>
  );
}