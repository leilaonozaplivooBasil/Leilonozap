/**
 * referral — memória do link de indicação (quem trouxe a venda)
 *
 * PROBLEMA QUE ISTO RESOLVE (auditoria 26/07/2026):
 * o código do link vivia só em sessionStorage. Ele morria ao fechar a aba, abrir
 * pelo WhatsApp e voltar, trocar de navegador ou comprar já logado por dentro do
 * app. Quando isso acontecia, o checkout mandava ref_code vazio e a venda caía no
 * indicador antigo do comprador — o licenciado que trouxe o cliente ficava sem a
 * comissão, em silêncio. Foi o que aconteceu no teste da conta Carvão Aceso.
 *
 * AGORA: o vínculo dura 90 dias em localStorage (sobrevive a abas, reinício do
 * navegador e ao PWA), com sessionStorage mantido em paralelo por compatibilidade
 * com o código antigo. Cada visita por um link novo renova a janela.
 */

const KEY = 'referralRef';        // { code, at }
const LEGACY_KEY = 'referralCode'; // string pura (compatibilidade)
export const REFERRAL_TTL_DAYS = 90;

const nowMs = () => Date.now();
const ttlMs = () => REFERRAL_TTL_DAYS * 24 * 60 * 60 * 1000;

/** Guarda o código do link (renova a validade a cada visita pelo link). */
export function saveReferral(code) {
  const clean = String(code || '').trim();
  if (!clean) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ code: clean, at: nowMs() }));
    localStorage.setItem(LEGACY_KEY, clean);
  } catch { /* storage indisponível (modo privado) */ }
  try {
    sessionStorage.setItem(LEGACY_KEY, clean);
  } catch { /* ignora */ }
}

/** Código válido do link, ou '' se não houver / tiver expirado. */
export function getReferral() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.code) {
        if (nowMs() - Number(parsed.at || 0) <= ttlMs()) return String(parsed.code);
        clearReferral(); // expirou: não atribui venda a um link velho
        return '';
      }
    }
  } catch { /* formato inesperado — cai nos fallbacks */ }

  // compatibilidade: quem já estava navegando antes desta versão
  try {
    const s = sessionStorage.getItem(LEGACY_KEY);
    if (s) return String(s);
  } catch { /* ignora */ }
  try {
    const l = localStorage.getItem(LEGACY_KEY);
    if (l) return String(l);
  } catch { /* ignora */ }
  return '';
}

export function clearReferral() {
  for (const store of [localStorage, sessionStorage]) {
    try {
      store.removeItem(KEY);
      store.removeItem(LEGACY_KEY);
    } catch { /* ignora */ }
  }
}

/** Quantos dias ainda valem — para mostrar ao licenciado, se quisermos. */
export function referralDaysLeft() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!parsed?.at) return 0;
    const restante = ttlMs() - (nowMs() - Number(parsed.at));
    return Math.max(0, Math.ceil(restante / (24 * 60 * 60 * 1000)));
  } catch {
    return 0;
  }
}
