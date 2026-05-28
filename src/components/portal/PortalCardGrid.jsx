import React, { useMemo } from "react";
import {
  Gavel, ShoppingBag, Briefcase, Store, Users, TrendingUp,
  Hammer, Building2, Shield, Crown,
} from "lucide-react";
import PortalCard from "./PortalCard";
import { resolveUserPanels } from "@/lib/panelResolver";

const ICONS = {
  Gavel, ShoppingBag, Briefcase, Store, Users, TrendingUp,
  Hammer, Building2, Shield, Crown,
};

// Gradiente do card + glow no hover, derivado da cor sólida do panelResolver
const COLOR_PRESETS = {
  loja_virtual:  { iconColor: "bg-gradient-to-br from-orange-500 to-orange-700",   gradient: "bg-gradient-to-br from-orange-500/10 to-transparent" },
  arrematante:   { iconColor: "bg-gradient-to-br from-emerald-500 to-emerald-700", gradient: "bg-gradient-to-br from-emerald-500/10 to-transparent" },
  vendedor:      { iconColor: "bg-gradient-to-br from-gray-600 to-gray-800",       gradient: "bg-gradient-to-br from-gray-500/10 to-transparent" },
  lojista:       { iconColor: "bg-gradient-to-br from-purple-500 to-purple-700",   gradient: "bg-gradient-to-br from-purple-500/10 to-transparent" },
  licenciado:    { iconColor: "bg-gradient-to-br from-blue-500 to-blue-700",       gradient: "bg-gradient-to-br from-blue-500/10 to-transparent" },
  investidor:    { iconColor: "bg-gradient-to-br from-amber-500 to-yellow-600",    gradient: "bg-gradient-to-br from-amber-500/10 to-transparent" },
  leiloeiro:     { iconColor: "bg-gradient-to-br from-red-500 to-red-700",         gradient: "bg-gradient-to-br from-red-500/10 to-transparent" },
  admin:         { iconColor: "bg-gradient-to-br from-slate-600 to-slate-800",     gradient: "bg-gradient-to-br from-slate-500/10 to-transparent" },
  super_admin:   { iconColor: "bg-gradient-to-br from-yellow-500 to-amber-600",    gradient: "bg-gradient-to-br from-yellow-500/10 to-transparent" },
};

export default function PortalCardGrid({ currentUser }) {
  const cards = useMemo(() => {
    const panels = resolveUserPanels(currentUser);
    return panels.map((p) => {
      const preset = COLOR_PRESETS[p.key] || { iconColor: "bg-gray-700", gradient: "bg-gray-500/10" };
      return {
        title: p.title,
        description: p.description,
        icon: ICONS[p.iconName] || ShoppingBag,
        iconColor: preset.iconColor,
        gradient: preset.gradient,
        badge: "Acesso Imediato",
        badgeType: "imediato",
        route: p.route,
      };
    });
  }, [currentUser]);

  if (cards.length === 0) {
    return (
      <section className="relative bg-gray-950 py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            Nenhum painel habilitado para sua conta. Fale com o suporte para solicitar acesso.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative bg-gray-950 py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {cards.map((card) => (
            <PortalCard key={card.title} {...card} />
          ))}
        </div>
      </div>
    </section>
  );
}
