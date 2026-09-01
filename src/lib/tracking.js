// 📊 DataLayer / GA4 / GTM — camada de rastreamento da jornada do lead.
// Autorizado pelo time de marketing (Ávila Business) em 11/08/2026.
// Só empurra eventos para window.dataLayer — não depende de nenhum script
// externo estar instalado ainda (GTM), então nunca quebra nada em produção.
import { useEffect, useRef } from 'react';
import { iniciarPixel, rastrear } from '@/lib/metaPixel';

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

/**
 * "Um lead aconteceu." Continua alimentando o dataLayer como sempre e, quando o
 * chamador informa um pixel, avisa a Meta também.
 *
 * 📊 31/08/2026 — o dono definiu: lead é quem EFETUA O CADASTRO. O evento entra
 * aqui, e não no ponto de chamada, para que exista UM lugar que significa "lead":
 * quem criar um caminho novo de cadastro amanhã chama esta função e o Meta vai
 * junto, sem depender de alguém lembrar de duas linhas.
 *
 * O pixel é PARÂMETRO, não fixo: o cadastro do Rank Premiado também passa por
 * aqui e não pode cair no pixel dos leilões — foi exatamente esse tipo de mistura
 * que o `trackSingle` de metaPixel.js veio corrigir. Sem pixel informado, nada é
 * enviado à Meta e o comportamento é o de antes.
 *
 * @param {string} lead_type     ex.: 'cadastro', 'cadastro_google'
 * @param {string} page_section  seção de origem, para o GA4
 * @param {string} [pixelId]     pixel da Meta que deve receber este Lead
 */
export function trackLead(lead_type, page_section, pixelId) {
  push({ event: 'lead', lead_type, page_section });
  if (!pixelId) return;
  // Garante o init antes de disparar: se a pessoa recarregou a página no meio do
  // cadastro, o fbq da visita anterior já morreu e o Lead se perderia calado.
  iniciarPixel(pixelId);
  rastrear(pixelId, 'Lead');
}

export function trackBeginCheckout(checkout_type, value, page_section) {
  push({ event: 'begin_checkout', checkout_type, value, currency: 'BRL', page_section });
}

export function trackPurchase(transaction_type, value, page_section) {
  push({ event: 'purchase', transaction_type, value, currency: 'BRL', page_section });
}