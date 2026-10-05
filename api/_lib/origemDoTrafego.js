// 📣 A ORIGEM DO TRÁFEGO, do lado do servidor (25/09/2026).
// O navegador manda o primeiro toque (src/lib/origemDoTrafego.js) junto com o
// cadastro; aqui só se aceita o que tem forma conhecida — chaves da lista,
// texto curto — e o resto cai fora. Nada disso é autoridade pra nada: é
// medição ("quantos leads vieram do Meta Ads").
const CHAVES = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ttclid', 'referrer', 'landing', 'em'];
const MAX = 200;

/** O objeto limpo, ou null quando não veio nada aproveitável. */
export function sanearOrigem(bruto) {
  let o = bruto;
  if (typeof o === 'string') { try { o = JSON.parse(o); } catch { return null; } }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const limpo = {};
  for (const k of CHAVES) {
    const v = o[k];
    if (v === undefined || v === null || v === '') continue;
    const s = String(v).trim().slice(0, MAX);
    if (s) limpo[k] = s;
  }
  if (!limpo.utm_source && !limpo.fbclid && !limpo.gclid) return null;
  if (!limpo.em || Number.isNaN(Date.parse(limpo.em))) limpo.em = new Date().toISOString();
  return limpo;
}
