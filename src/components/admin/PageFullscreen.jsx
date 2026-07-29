import React, { useState, useCallback, useEffect } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

/**
 * PageFullscreen — wrapper que adiciona botão "Tela cheia" a páginas de trabalho.
 *
 * Uso: envolva o return da página com <PageFullscreen>...</PageFullscreen>
 * - Quando NÃO fullscreen: renderiza children normalmente + botão flutuante
 * - Quando fullscreen: children dentro de fixed inset-0 z-[90] + botão "Sair"
 *
 * Esc sai do fullscreen. Não altera nenhuma lógica de negócio.
 */
export default function PageFullscreen({ children }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggle = useCallback(() => setIsFullscreen((v) => !v), []);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  if (isFullscreen) {
    return (
      <>
        <div className="fixed inset-0 z-[90] bg-gray-950 overflow-auto">
          {children}
        </div>
        <button
          onClick={toggle}
          className="fixed z-[100] top-4 right-4 flex items-center gap-1.5 rounded-lg bg-gray-100 border border-gray-300 px-3 py-2 text-[12px] font-medium text-gray-900 hover:bg-white transition-all shadow-lg"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          Sair da tela cheia
        </button>
      </>
    );
  }

  return (
    <>
      {children}
      <button
        onClick={toggle}
        className="fixed z-[100] bottom-5 left-5 flex items-center gap-1.5 rounded-lg bg-[#0a0f1c]/90 border border-white/10 px-3 py-2 text-[12px] font-medium text-gray-300 hover:text-white hover:border-emerald-500/30 backdrop-blur transition-all shadow-lg"
        title="Abrir em tela cheia"
      >
        <Maximize2 className="w-3.5 h-3.5" />
        Tela cheia
      </button>
    </>
  );
}