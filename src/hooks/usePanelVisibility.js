import { useEffect, useRef } from "react";

/**
 * 🔄 usePanelVisibility — Hook que dispara um refresh quando:
 *   1. A aba volta a ficar visível (visibilitychange)
 *   2. A janela ganha foco (focus)
 *   3. (Opcional) Em intervalo regular
 *
 * Fundamental para mobile, onde setInterval pausa em background.
 *
 * @param {Function} onRefresh - Callback a ser chamado quando precisar recarregar
 * @param {Object} options
 * @param {number} [options.intervalMs] - Intervalo opcional de polling (default: 0 = desligado)
 * @param {number} [options.throttleMs] - Tempo mínimo entre refreshes (default: 3000)
 * @param {boolean} [options.enabled] - Se o hook está ativo (default: true)
 *
 * @example
 *   usePanelVisibility(() => loadData(), { intervalMs: 60000 });
 */
export function usePanelVisibility(onRefresh, options = {}) {
  const {
    intervalMs = 0,
    throttleMs = 3000,
    enabled = true,
  } = options;

  const lastRefreshRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);

  // Mantém ref atualizada sem recriar handlers
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled || typeof onRefreshRef.current !== "function") return;

    const tryRefresh = (reason) => {
      const now = Date.now();
      if (now - lastRefreshRef.current < throttleMs) return; // throttle
      lastRefreshRef.current = now;
      try {
        onRefreshRef.current(reason);
      } catch (err) {
        // Falha silenciosa — não quebrar a UI por erro de refresh
        console.debug("[usePanelVisibility] refresh error:", err?.message);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        tryRefresh("visibility");
      }
    };

    const handleFocus = () => tryRefresh("focus");

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    // Polling opcional (mínimo 5s pra evitar abuso)
    let intervalId = null;
    if (intervalMs >= 5000) {
      intervalId = setInterval(() => tryRefresh("interval"), intervalMs);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      if (intervalId) clearInterval(intervalId);
    };
  }, [enabled, intervalMs, throttleMs]);
}

export default usePanelVisibility;