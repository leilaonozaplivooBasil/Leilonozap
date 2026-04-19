import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Componente invisível que rastreia tempos de carregamento de páginas.
 * Uso: <PagePerformanceTracker pageName="Home" />
 * Não renderiza nada na tela.
 */
export default function PagePerformanceTracker({ pageName }) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    const startTime = performance.now();

    // Espera o próximo frame paint para medir tempo real de renderização
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const loadTime = Math.round(performance.now() - startTime);

        base44.analytics.track({
          eventName: "page_load_time",
          properties: {
            page: pageName,
            load_time_ms: loadTime,
            is_mobile: /Mobi|Android/i.test(navigator.userAgent),
            connection: navigator.connection?.effectiveType || "unknown",
          },
        });
      });
    });
  }, [pageName]);

  return null;
}