import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Gavel, ShoppingBag, Briefcase, Store, Users, TrendingUp,
  Hammer, Building2, Shield, Crown, ChevronRight,
} from "lucide-react";
import { resolveUserPanels } from "@/lib/panelResolver";

const ICONS = {
  Gavel, ShoppingBag, Briefcase, Store, Users, TrendingUp,
  Hammer, Building2, Shield, Crown,
};

// Cor sólida por painel (usada no badge + ícone do switcher)
const PANEL_COLOR = {
  loja_virtual: { ring: "ring-orange-500/40",  bg: "bg-orange-500/15",  text: "text-orange-300",  dot: "bg-orange-500"  },
  arrematante:  { ring: "ring-emerald-500/40", bg: "bg-emerald-500/15", text: "text-emerald-300", dot: "bg-emerald-500" },
  vendedor:     { ring: "ring-purple-500/40",  bg: "bg-purple-500/15",  text: "text-purple-300",  dot: "bg-purple-500"  },
  lojista:      { ring: "ring-fuchsia-500/40", bg: "bg-fuchsia-500/15", text: "text-fuchsia-300", dot: "bg-fuchsia-500" },
  licenciado:   { ring: "ring-blue-500/40",    bg: "bg-blue-500/15",    text: "text-blue-300",    dot: "bg-blue-500"    },
  investidor:   { ring: "ring-amber-500/40",   bg: "bg-amber-500/15",   text: "text-amber-300",   dot: "bg-amber-500"   },
  leiloeiro:    { ring: "ring-red-500/40",     bg: "bg-red-500/15",     text: "text-red-300",     dot: "bg-red-500"     },
  admin:        { ring: "ring-slate-500/40",   bg: "bg-slate-500/15",   text: "text-slate-200",   dot: "bg-slate-500"   },
  super_admin:  { ring: "ring-yellow-500/40",  bg: "bg-yellow-500/15",  text: "text-yellow-300",  dot: "bg-yellow-500"  },
};

/**
 * Card de alta visibilidade no topo do painel.
 * Mostra ONDE o usuário está + chips pra trocar de painel rápido.
 *
 * Props:
 *   currentUser     — AppUser (pra resolver painéis habilitados)
 *   currentContext  — string ("loja_virtual" | "arrematante" | ... | "admin")
 */
export default function PanelSwitcherCard({ currentUser, currentContext }) {
  const navigate = useNavigate();

  const { current, others } = useMemo(() => {
    const all = resolveUserPanels(currentUser);
    const cur = all.find((p) => p.key === currentContext) || null;
    const oth = all.filter((p) => p.key !== currentContext);
    return { current: cur, others: oth };
  }, [currentUser, currentContext]);

  if (!current) return null;

  const Icon = ICONS[current.iconName] || ShoppingBag;
  const color = PANEL_COLOR[current.key] || PANEL_COLOR.admin;

  return (
    <div
      className="relative mx-3 sm:mx-4 md:mx-6 my-3 sm:my-4 rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.7) 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      }}
    >
      <div className={`absolute inset-0 ${color.bg} opacity-30 pointer-events-none`} />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5">
        {/* Painel atual */}
        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
          <div className={`w-11 h-11 rounded-xl ${color.bg} ring-2 ${color.ring} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${color.text}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold tracking-wider text-gray-400 uppercase">
              Você está em
            </p>
            <p className="text-sm sm:text-base font-bold text-white truncate">
              {current.title}
            </p>
          </div>
        </div>

        {/* Divider visível só em sm+ */}
        <div className="hidden sm:block w-px h-10 bg-white/10 flex-shrink-0" />

        {/* Chips dos outros painéis (scroll horizontal em mobile) */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-bold tracking-wider text-gray-400 uppercase mb-1.5 sm:hidden">
            Trocar pra:
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
            {others.length === 0 ? (
              <span className="text-xs text-gray-500 italic">Sem outros painéis habilitados</span>
            ) : (
              others.map((p) => {
                const PIcon = ICONS[p.iconName] || ShoppingBag;
                const c = PANEL_COLOR[p.key] || PANEL_COLOR.admin;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => navigate(p.route)}
                    title={`Acessar ${p.title}`}
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border border-white/5 hover:border-white/20 hover:scale-105 ${c.bg} ${c.text}`}
                  >
                    <PIcon className="w-3.5 h-3.5" />
                    <span>{p.title}</span>
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
