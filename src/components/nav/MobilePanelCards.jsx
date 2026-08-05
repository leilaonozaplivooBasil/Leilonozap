import React from "react";
import {
  User as UserIcon, ShoppingBag, Gavel, Store, Building2, Briefcase,
  TrendingUp, Hammer, Shield, Crown,
} from "lucide-react";

const ICON_MAP = { ShoppingBag, Gavel, Store, Building2, Briefcase, TrendingUp, Hammer, Shield, Crown };

const ACCENT = {
  loja_virtual: { text: "text-orange-300", icon: "text-orange-400", border: "border-orange-500/30" },
  arrematante: { text: "text-emerald-300", icon: "text-emerald-400", border: "border-emerald-500/30" },
  vendedor: { text: "text-purple-300", icon: "text-purple-400", border: "border-purple-500/30" },
  lojista: { text: "text-fuchsia-300", icon: "text-fuchsia-400", border: "border-fuchsia-500/30" },
  licenciado: { text: "text-blue-300", icon: "text-blue-400", border: "border-blue-500/30" },
  parceiro_compra: { text: "text-amber-300", icon: "text-amber-400", border: "border-amber-500/30" },
  investidor: { text: "text-amber-300", icon: "text-amber-400", border: "border-amber-500/30" },
  leiloeiro: { text: "text-red-300", icon: "text-red-400", border: "border-red-500/30" },
  admin: { text: "text-slate-200", icon: "text-slate-300", border: "border-slate-500/30" },
  super_admin: { text: "text-yellow-300", icon: "text-yellow-400", border: "border-yellow-500/40" },
};

/** Seção "Acessar como..." — cards de painel, padrão único para TODOS os perfis. */
export default function MobilePanelCards({ panels, storeName, titulo, onGo }) {
  if (!panels?.length) return null;
  return (
    <div className="pt-4 mt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="font-bold text-[10px] uppercase tracking-wider px-4 mb-3 text-gray-500">{titulo}</p>
      <div className="space-y-2">
        {panels.map((panel) => {
          const accent = ACCENT[panel.key] || ACCENT.arrematante;
          const Icon = ICON_MAP[panel.iconName] || UserIcon;
          const subtitle = panel.key === "lojista" && storeName ? `Loja: ${storeName}` : panel.description;
          return (
            <button
              key={panel.key}
              onClick={() => onGo(panel.route)}
              className={`w-full flex min-h-[56px] items-center gap-3 p-3 rounded-xl border ${accent.border} text-left transition-all duration-200 active:scale-[0.98]`}
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <Icon className={`w-5 h-5 ${accent.icon} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${accent.text} truncate`}>{panel.title}</p>
                <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}