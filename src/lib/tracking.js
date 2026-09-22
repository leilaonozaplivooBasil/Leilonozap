// 📊 DataLayer / GTM — camada de rastreamento da jornada do lead.
// Autorizado pelo time de marketing (Ávila Business) em 11/08/2026.
// Só empurra eventos para window.dataLayer — não depende de nenhum script
// externo estar instalado, então nunca quebra nada em produção.
//
// 🧹 22/09/2026 — este arquivo virou a ÚNICA porta de saída do rastreamento.
// Antes ele também disparava o pixel da Meta direto daqui. Não dispara mais:
// o dono definiu que o contêiner do GTM (GTM-K2KHK4CB) manda em tudo, e quem
// quiser Meta, GA4 ou Ads configura lá dentro, em cima destes eventos.
// Ver src/docs/GTM.md.
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
  }, [sectionName]);
}

export function trackCtaClick(cta_name, page_section) {
  push({ event: 'cta_click', cta_name, page_section });
}

/**
 * "Um lead aconteceu."
 *
 * 📊 31/08/2026 — o dono definiu: lead é quem EFETUA O CADASTRO. O evento entra
 * aqui, e não no ponto de chamada, para que exista UM lugar que significa "lead":
 * quem criar um caminho novo de cadastro amanhã chama esta função e o rastreamento
 * vai junto, sem depender de alguém lembrar de duas linhas.
 *
 * 🧹 22/09/2026 — saiu o terceiro parâmetro `pixelId`, que mandava o Lead direto
 * pra Meta. Agora quem decide o destino é o contêiner do GTM: ele escuta o evento
 * `lead` e reparte para Meta, GA4 ou Ads conforme configurado lá.
 *
 * `lead_type` continua distinguindo a origem ('cadastro' dos leilões x o do Rank
 * Premiado). Era ISSO que o pixel separado resolvia antes, e é por `lead_type`
 * que o GTM tem de separar agora — senão os dois funis se misturam de novo.
 *
 * @param {string} lead_type     ex.: 'cadastro', 'cadastro_google'
 * @param {string} page_section  seção de origem
 */
export function trackLead(lead_type, page_section) {
  push({ event: 'lead', lead_type, page_section });
}

export function trackBeginCheckout(checkout_type, value, page_section) {
  push({ event: 'begin_checkout', checkout_type, value, currency: 'BRL', page_section });
}

export function trackPurchase(transaction_type, value, page_section) {
  push({ event: 'purchase', transaction_type, value, currency: 'BRL', page_section });
}