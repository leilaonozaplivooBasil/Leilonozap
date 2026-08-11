// 📊 DataLayer / GA4 / GTM — camada de rastreamento da jornada do lead.
// Autorizado pelo time de marketing (Ávila Business) em 11/08/2026.
// Só empurra eventos para window.dataLayer — não depende de nenhum script
// externo estar instalado ainda (GTM), então nunca quebra nada em produção.
import { useEffect, useRef } from 'react';

function push(event) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ timestamp: new Date().toISOString(), ...event });
  } catch (_) { /* nunca deixa o tracking quebrar a página */ }
}

// Hook: dispara section_enter ao montar e section_time ao desmontar (ou trocar de seção).
export function useSectionTracking(sectionName, pageTitle) {
  const startRef = useRef(Date.now());
  useEffect(() => {
    startRef.current = Date.now();
    push({ event: 'section_enter', page_section: sectionName, page_path: window.location.pathname, page_title: pageTitle || document.title });
    return () => {
      const time_spent_seconds = Math.round((Date.now() - startRef.current) / 1000);
      push({ event: 'section_time', page_section: sectionName, time_spent_seconds });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionName]);
}

export function trackCtaClick(cta_name, page_section) {
  push({ event: 'cta_click', cta_name, page_section });
}

export function trackLead(lead_type, page_section) {
  push({ event: 'lead', lead_type, page_section });
}

export function trackBeginCheckout(checkout_type, value, page_section) {
  push({ event: 'begin_checkout', checkout_type, value, currency: 'BRL', page_section });
}

export function trackPurchase(transaction_type, value, page_section) {
  push({ event: 'purchase', transaction_type, value, currency: 'BRL', page_section });
}