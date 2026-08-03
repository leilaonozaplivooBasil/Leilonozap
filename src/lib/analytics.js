import posthog from 'posthog-js';

let ativo = false;

/**
 * Liga a análise de comportamento (funil, gravação de sessão).
 * Só roda em produção E só se a chave existir. Falha = silêncio total.
 */
export function initAnalytics() {
  try {
    const chave = import.meta.env.VITE_POSTHOG_KEY;
    if (!import.meta.env.PROD || !chave) return;

    posthog.init(chave, {
      api_host: 'https://us.i.posthog.com',
      autocapture: true,
      capture_pageview: true,
      session_recording: {
        // Mesma regra de privacidade do Sentry: nada digitado é gravado.
        maskAllInputs: true,
      },
    });
    ativo = true;
  } catch (erro) {
    console.debug('PostHog não inicializado:', erro?.message);
  }
}

/**
 * Registra um evento de produto. Se a análise não estiver ligada
 * (desenvolvimento, preview, chave ausente), não faz nada e nunca lança erro.
 * ⚠️ Nunca enviar dado pessoal aqui (nome, e-mail, CPF, telefone).
 */
export function trackEvent(nome, props = {}) {
  if (!ativo) return;
  try {
    posthog.capture(nome, props);
  } catch (_) { /* nunca interrompe o fluxo do usuário */ }
}