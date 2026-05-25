import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { resolveUserPanels } from "@/lib/panelResolver";
import PainelSelectorCard from "./PainelSelectorCard";

/**
 * PainelSelector — Modal/Sheet global que aparece após o login.
 *
 * Comportamento:
 *  • length === 0 → não abre nada
 *  • length === 1 → redireciona direto pro painel (UX inteligente)
 *  • length >= 2 → exibe modal/sheet com os cards
 *
 * Controlado por evento global: window dispatch 'panelSelectorRequested'
 * com detail = { user } — qualquer ponto do app pode disparar.
 */
export default function PainelSelector() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);

  const panels = useMemo(() => resolveUserPanels(user), [user]);

  // Listener global
  useEffect(() => {
    const handleRequest = (e) => {
      const incomingUser = e?.detail?.user;
      if (!incomingUser) return;

      const list = resolveUserPanels(incomingUser);

      // 0 painéis → ignora
      if (list.length === 0) return;

      // 1 painel → vai direto
      if (list.length === 1) {
        navigate(list[0].route);
        return;
      }

      // 2+ painéis → mostra modal
      setUser(incomingUser);
      setOpen(true);
    };

    window.addEventListener("panelSelectorRequested", handleRequest);
    return () => window.removeEventListener("panelSelectorRequested", handleRequest);
  }, [navigate]);

  // Bloqueia scroll do body quando aberto
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const handleSelect = (panel) => {
    setOpen(false);
    setTimeout(() => navigate(panel.route), 120);
  };

  const handleClose = () => setOpen(false);

  if (!open || panels.length === 0) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998]"
            onClick={handleClose}
          />

          {/* Container responsivo:
              - Mobile (< sm): bottom sheet
              - Desktop (sm+): modal centralizado */}
          <motion.div
            key="sheet"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed z-[9999] left-0 right-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="bg-gray-900 border border-gray-700/70 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[88vh] overflow-hidden flex flex-col">
              {/* Handle do bottom sheet (visível no mobile) */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 rounded-full bg-gray-700" />
              </div>

              {/* Header */}
              <div className="px-5 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-black text-white">
                    Olá{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}! 👋
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    Você tem acesso a {panels.length} painéis. Escolha por onde começar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Fechar"
                  className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lista de painéis */}
              <div className="px-5 sm:px-6 pb-4 sm:pb-5 overflow-y-auto flex flex-col gap-2 sm:gap-3">
                {panels.map((panel, i) => (
                  <PainelSelectorCard
                    key={panel.key}
                    panel={panel}
                    index={i}
                    onClick={handleSelect}
                  />
                ))}
              </div>

              {/* Rodapé */}
              <div className="px-5 sm:px-6 py-3 sm:py-4 border-t border-gray-800 bg-gray-900/80">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full text-center text-xs sm:text-sm text-gray-400 hover:text-white transition-colors py-2"
                >
                  Continuar navegando livremente
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Helper utilitário: dispara o evento global do seletor.
 * Importe em qualquer página: `import { triggerPanelSelector } from "@/components/portal/PainelSelector";`
 */
export function triggerPanelSelector(user) {
  if (!user) return;
  window.dispatchEvent(
    new CustomEvent("panelSelectorRequested", { detail: { user } })
  );
}