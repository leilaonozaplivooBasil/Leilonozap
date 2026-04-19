import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Link2, Copy, Edit, ExternalLink, Power } from "lucide-react";
import { toast } from "sonner";

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
}

function storeName(u) {
  return u.store_name || ("L. Virtual " + (u.full_name || "Sem nome"));
}

export default function LicenseeListItem({ licensee, selected, onSelect, onEdit }) {
  const qc = useQueryClient();
  const [toggling, setToggling] = useState(false);
  const isActive = (licensee.career_levels || []).includes("licenciado_catalogo");

  const handleToggle = async (e) => {
    e.stopPropagation();
    setToggling(true);
    const currentLevels = licensee.career_levels || [];
    const newLevels = isActive
      ? currentLevels.filter(l => l !== "licenciado_catalogo")
      : [...currentLevels, "licenciado_catalogo"];
    await base44.entities.AppUser.update(licensee.id, { career_levels: newLevels });
    toast.success(isActive ? "Loja desativada" : "Loja ativada");
    qc.invalidateQueries({ queryKey: ["licensees"] });
    setToggling(false);
  };
  const referral = licensee.referral_code || "";
  const link = `https://leilaonozap.net/Loja-Virtual?ref=${referral}`;
  const displayLink = `leilaonozap.net/Loja-Virtual?ref=${referral}`;
  const name = storeName(licensee);

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
          <p className="font-medium text-white truncate">{licensee.full_name || "Sem nome"}</p>
          <div className="text-xs text-gray-400 truncate flex items-center gap-1">
            <Link2 className="w-3.5 h-3.5" /> {displayLink}
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
        <div className="ml-2" onClick={handleToggle}>
          <Badge className={`cursor-pointer flex items-center gap-1 transition-colors ${isActive ? "bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400" : "bg-gray-700 text-gray-300 hover:bg-green-500/20 hover:text-green-400"}`}>
            <Power className="w-3 h-3" />
            {toggling ? "..." : isActive ? "Loja ativa" : "Loja inativa"}
          </Badge>
        </div>
      </div>
    </button>
  );
}