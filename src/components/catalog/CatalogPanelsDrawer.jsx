import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Gavel, ShoppingBag, Briefcase, Store, Users, TrendingUp,
  Hammer, Building2, Shield, Crown, ChevronRight,
} from "lucide-react";
import { resolveUserPanels } from "@/lib/panelResolver";

/**
 * CatalogPanelsDrawer — Drawer lateral (⋮) que substitui a barra
 * horizontal de painéis coloridos no topo da Loja Virtual.
 *
 * Reaproveita a MESMA lógica do PainelSelector via resolveUserPanels.
 * Não duplica navegação, não toca em auth, não muda rotas.
 */

const ICONS = {
  Gavel, ShoppingBag, Briefcase, Store, Users, TrendingUp,
  Hammer, Building2, Shield, Crown,
};

const PANEL_COLOR = {
  loja_virtual: { bg: "bg-orange-500/15",  text: "text-orange-300",  ring: "ring-orange-500/40" },
  arrematante:  { bg: "bg-emerald-500/15", text: "text-emerald-300", ring: "ring-emerald-500/40" },
  vendedor:     { bg: "bg-purple-500/15",  text: "text-purple-300",  ring: "ring-purple-500/40" },
  lojista:      { bg: "bg-fuchsia-500/15", text: "text-fuchsia-300", ring: "ring-fuchsia-500/40" },
  licenciado:   { bg: "bg-blue-500/15",    text: "text-blue-300",    ring: "ring-blue-500/40" },
  investidor:   { bg: "bg-amber-500/15",   text: "text-amber-300",   ring: "ring-amber-500/40" },
  leiloeiro:    { bg: "bg-red-500/15",     text: "text-red-300",     ring: "ring-red-500/40" },
  admin:        { bg: "bg-slate-500/15",   text: "text-slate-200",   ring: "ring-slate-500/40" },
  super_admin:  { bg: "bg-yellow-500/15",  text: "text-yellow-300",  ring: "ring-yellow-500/40" },
};

export default function CatalogPanelsDrawer({ isOpen, onClose, currentUser }) {
  const navigate = useNavigate();
  const panels = resolveUserPanels(currentUser);

  // ESC pra fechar
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Bloqueia scroll do body quando aberto
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  const handleSelect = (panel) => {
    onClose();
    setTimeout(() => navigate(panel.route), 120);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer lateral direito (desktop) / bottom sheet (mobile) */}
          <motion.aside
            key="drawer-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-[9999] w-full sm:w-[420px] bg-gray-900 border-l border-gray-800 shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Trocar painel"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Header do drawer */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-800">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">Trocar painel</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Você tem acesso a {panels.length} {panels.length === 1 ? "área" : "áreas"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-2">
              {panels.length === 0 && (
                <div className="text-center py-10 text-gray-500 text-sm">
                  Nenhum painel disponível.
                </div>
              )}
              {panels.map((panel) => {
                const Icon = ICONS[panel.iconName] || ShoppingBag;
                const color = PANEL_COLOR[panel.key] || PANEL_COLOR.admin;
                return (
                  <button
                    key={panel.key}
                    type="button"
                    onClick={() => handleSelect(panel)}
                    className={`group w-full flex items-center gap-4 p-4 rounded-xl border border-gray-800 hover:border-emerald-500/50 bg-gray-800/40 hover:bg-gray-800/80 transition-all text-left`}
                  >
                    <div className={`w-12 h-12 rounded-xl ${color.bg} ring-2 ${color.ring} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${color.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-base truncate">{panel.title}</p>
                      <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{panel.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 flex-shrink-0 transition-colors" />
                  </button>
                );
              })}
            </div>

            {/* Rodapé */}
            <div className="px-5 py-3 border-t border-gray-800 text-center">
              <p className="text-[11px] text-gray-500">
                Continue navegando na Loja Virtual
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}