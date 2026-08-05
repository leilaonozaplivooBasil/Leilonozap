import * as Sentry from "@sentry/react";

// 🔒 Rotas onde a gravação de sessão é PROIBIDA (LGPD): checkout, pagamento,
// carteira e cadastro exibem CPF, endereço, PIX e cartão. Nessas telas o replay
// é interrompido — nada é gravado.
const ROTAS_SENSIVEIS = [
  'checkout',
  'payment',
  'pagamento',
  'carteira',
  'wallet',
  'cadastro',
  'register',
  'addfunds',
  'resetpassword',
  'forgotpassword',
];

function emRotaSensivel() {
  const caminho = (window.location.pathname || '').toLowerCase();
  return ROTAS_SENSIVEIS.some((r) => caminho.includes(r));
}

/**
 * Liga o monitoramento de erros. Só roda em produção E só se o DSN existir —
 * sem a variável de ambiente, não inicializa e não envia nada.
 * Qualquer falha aqui é engolida: observabilidade nunca derruba o app.
 */
export function initSentry() {
  try {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!import.meta.env.PROD || !dsn) return;

    const replay = Sentry.replayIntegration({
      // Privacidade: nenhum texto digitado e nenhuma mídia sai do dispositivo.
      maskAllInputs: true,
      maskAllText: false,
      blockAllMedia: true,
    });

    Sentry.init({
      dsn,
      environment: 'production',
      integrations: [Sentry.browserTracingIntegration(), replay],
      // 🔇 O registro do Service Worker do PWA (registerSW.js, gerado pelo plugin
      // no build — não é código nosso) rejeita a promessa em alguns Android/Chrome
      // Mobile. O site funciona normal; só o modo offline não registra naquele
      // aparelho. Como o plugin não trata a rejeição, o Sentry recebia isso como
      // "unhandled rejection" de alta prioridade e disparava e-mail toda vez.
      // Aqui esse evento é descartado ANTES de sair do navegador. Nenhum outro
      // erro é afetado — o PWA e o aviso de nova versão seguem funcionando.
      beforeSend(event) {
        try {
          const assinatura = JSON.stringify(event.exception || {});
          if (assinatura.includes('registerSW') || assinatura.includes('ServiceWorkerContainer')) return null;
        } catch (_) { /* se não der pra inspecionar, envia normalmente */ }
        return event;
      },
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });

    // Se a pessoa entrar numa tela financeira, para de gravar na hora;
    // ao sair, volta a gravar. Cobre navegação SPA (sem recarregar a página).
    const ajustarReplay = () => {
      try {
        if (emRotaSensivel()) replay.stop();
        else replay.start();
      } catch (_) { /* replay já parado/iniciado */ }
    };
    ajustarReplay();
    window.addEventListener('popstate', ajustarReplay);
    const pushOriginal = window.history.pushState;
    window.history.pushState = function (...args) {
      const r = pushOriginal.apply(this, args);
      ajustarReplay();
      return r;
    };
  } catch (erro) {
    console.debug('Sentry não inicializado:', erro?.message);
  }
}