/**
 * PONTO 69 — Origem única de retorno pós-depósito.
 *
 * Regra dura: o destino de retorno NUNCA pode ser uma tela de depósito
 * (senão o usuário paga, volta pra tela de pagar e paga de novo).
 */

const KEY = 'nz_origem_deposito';
const DESTINO_PADRAO = '/leiloes';

// Telas que só servem para PAGAR — nunca podem ser destino de volta.
const TELAS_DE_DEPOSITO = ['/passaporte', '/auctioncheckoutmodern', '/addfunds', '/checkout', '/catalogcheckout'];

export function ehDestinoValido(path) {
  if (!path || typeof path !== 'string') return false;
  if (!path.startsWith('/')) return false; // só rotas internas
  const base = path.split('?')[0].toLowerCase();
  return !TELAS_DE_DEPOSITO.some((t) => base === t || base.startsWith(t + '/'));
}

/** Chamar no momento em que o usuário INICIA um depósito, na página de origem. */
export function registrarOrigemDeposito(path) {
  const alvo = path || window.location.pathname + window.location.search;
  if (!ehDestinoValido(alvo)) return;
  try { sessionStorage.setItem(KEY, alvo); } catch { /* storage indisponível */ }
}

/** Lê a origem sem apagar (para montar o returnTo do checkout). */
export function obterOrigemDeposito() {
  // 1) ?returnTo= explícito na URL
  try {
    const q = new URLSearchParams(window.location.search).get('returnTo');
    if (ehDestinoValido(q)) return q;
  } catch { /* ignora */ }

  // 2) origem registrada na sessão
  try {
    const salvo = sessionStorage.getItem(KEY);
    if (ehDestinoValido(salvo)) return salvo;
  } catch { /* ignora */ }

  // 3) referrer interno (mesma origem)
  try {
    const ref = document.referrer;
    if (ref && ref.startsWith(window.location.origin)) {
      const p = ref.slice(window.location.origin.length);
      if (ehDestinoValido(p)) return p;
    }
  } catch { /* ignora */ }

  return DESTINO_PADRAO;
}

/** Lê e limpa — usar no retorno, depois do pagamento confirmado. */
export function consumirOrigemDeposito() {
  const destino = obterOrigemDeposito();
  try { sessionStorage.removeItem(KEY); } catch { /* ignora */ }
  return destino;
}

export { DESTINO_PADRAO };