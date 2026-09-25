// 📣 DE ONDE A PESSOA VEIO — utm / fbclid / gclid (25/09/2026).
//
// Dono: "identifique quantos leads vierem do Meta Ads". Hoje nada guarda isso.
// Regra: o PRIMEIRO toque vale (first-touch) — quem chegou pelo anúncio e
// voltou dias depois pelo Google continua sendo lead do anúncio. Guardado no
// aparelho (localStorage) até a pessoa se cadastrar; aí sobe junto com o
// cadastro e fica em app_users.origem_trafego (o navegador NÃO lê essa
// coluna de volta — só o servidor grava).
//
// Puro: sem window aqui dentro além do storage que a tela passa.
export const CHAVE_ORIGEM = 'nz_origem_trafego';
const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ttclid'];
const MAX = 200;

function armazem(storage) {
  if (storage) return storage;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

/** O que a URL diz sobre a origem, ou null quando não diz nada. */
export function origemDaUrl(search = '', { referrer = '', landing = '', agora = new Date() } = {}) {
  let p;
  try { p = new URLSearchParams(search || ''); } catch { return null; }
  const o = {};
  for (const k of PARAMS) { const v = String(p.get(k) || '').trim().slice(0, MAX); if (v) o[k] = v; }
  if (!Object.keys(o).length) return null;
  // fbclid sem utm_source é anúncio do Meta do mesmo jeito
  if (!o.utm_source && o.fbclid) o.utm_source = 'facebook';
  if (!o.utm_source && o.gclid) o.utm_source = 'google';
  if (!o.utm_medium && (o.fbclid || o.gclid)) o.utm_medium = 'paid';
  return {
    ...o,
    referrer: String(referrer || '').slice(0, MAX) || null,
    landing: String(landing || '').slice(0, MAX) || null,
    em: agora.toISOString(),
  };
}

/** É tráfego pago do Meta (Facebook/Instagram)? */
export function ehMetaAds(origem) {
  if (!origem) return false;
  if (origem.fbclid) return true;
  const s = String(origem.utm_source || '').toLowerCase();
  return ['facebook', 'fb', 'instagram', 'ig', 'meta', 'meta_ads'].includes(s);
}

/** Guarda o primeiro toque (não sobrescreve o que já estava). Devolve o que ficou. */
export function capturarOrigemDoTrafego(search, { referrer, landing, storage, agora } = {}) {
  const st = armazem(storage);
  const atual = lerOrigemDoTrafego(st);
  if (atual) return atual;
  const nova = origemDaUrl(search, { referrer, landing, agora });
  if (!nova) return null;
  try { st?.setItem(CHAVE_ORIGEM, JSON.stringify(nova)); } catch { /* sem storage: só não lembra */ }
  return nova;
}

export function lerOrigemDoTrafego(storage) {
  try {
    const bruto = armazem(storage)?.getItem(CHAVE_ORIGEM);
    const o = bruto ? JSON.parse(bruto) : null;
    return o && typeof o === 'object' && (o.utm_source || o.fbclid || o.gclid) ? o : null;
  } catch { return null; }
}

export function limparOrigemDoTrafego(storage) {
  try { armazem(storage)?.removeItem(CHAVE_ORIGEM); } catch { /* nada */ }
}
