// Livoo Connect v2 — helper S2S (server-side). Assina toda chamada:
//   Authorization: Bearer <secret> · X-Livoo-Partner: <id> · Idempotency-Key (nos POST) ·
//   X-Livoo-Timestamp + X-Livoo-Signature = HMAC_SHA256(secret, `${ts}.${method}.${path}.${sha256(body)}`)
// Sandbox (sem secret): gera ids sintéticos pro fluxo funcionar — MESMAS funções, zero mudança no app.
import crypto from 'crypto';
import { livooConfig, livooConfigured } from './config.js';

function shortHash(input) {
  let h = 2166136261;
  for (let i = 0; i < String(input).length; i++) { h ^= String(input).charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

async function api(method, path, body, idempotencyKey) {
  const bodyStr = body ? JSON.stringify(body) : '';
  const ts = Math.floor(Date.now() / 1000).toString();
  const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
  const sig = crypto.createHmac('sha256', livooConfig.partnerSecret).update(`${ts}.${method}.${path}.${bodyHash}`).digest('hex');
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${livooConfig.partnerSecret}`,
    'X-Livoo-Partner': livooConfig.partnerId,
    'X-Livoo-Timestamp': ts,
    'X-Livoo-Signature': sig,
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(`${livooConfig.base}${path}`, { method, headers, body: bodyStr || undefined });
  if (!res.ok) { const d = await res.text().catch(() => ''); throw new Error(`Livoo ${method} ${path} → ${res.status} ${d.slice(0, 200)}`); }
  return res.json();
}

export const livoo = {
  configured: livooConfigured,

  async provisionUser(input) {
    if (!livooConfigured) {
      const id = shortHash(`${livooConfig.partnerId}:${input.partner_user_id}`);
      return { livoo_user_id: `lu_sandbox_${id}`, partner_user_id: input.partner_user_id, status: 'pending_kyc', wallet_id: `lw_sandbox_${id}`, kyc_status: 'not_started', can_withdraw: false, sandbox: true };
    }
    return api('POST', '/users', input, `user:${input.partner_user_id}`);
  },

  async mintSession(livooUserId) {
    if (!livooConfigured) return { host_url: `${livooConfig.appBase}/host?u=${livooUserId}&sandbox=1`, embed_token: `sbx_${shortHash(livooUserId)}` };
    return api('POST', `/users/${livooUserId}/session`, {});
  },

  async getKyc(livooUserId) {
    if (!livooConfigured) return { status: 'not_started', can_withdraw: false };
    return api('GET', `/users/${livooUserId}/kyc`);
  },

  async startKyc(livooUserId, payload) {
    if (!livooConfigured) return { status: 'pending', hosted_url: `${livooConfig.appBase}/kyc?u=${livooUserId}&sandbox=1` };
    return api('POST', `/users/${livooUserId}/kyc`, payload || {}, `kyc:${livooUserId}`);
  },

  async putProducts(livooUserId, products) {
    if (!livooConfigured) return { count: products.length };
    return api('PUT', `/users/${livooUserId}/products`, { products });
  },

  async putLots(livooUserId, lots) {
    if (!livooConfigured) return { count: lots.length };
    return api('PUT', `/users/${livooUserId}/lots`, { lots });
  },

  async createLive(input) {
    if (!livooConfigured) {
      const liveId = `ll_sandbox_${shortHash(`${input.host_livoo_user_id}:${input.title}:${input.mode}`)}`;
      return { live_id: liveId, mode: input.mode, status: 'live', host_livoo_user_id: input.host_livoo_user_id, title: input.title, host_url: `${livooConfig.appBase}/host/${liveId}?sandbox=1`, embed_url: `${livooConfig.appBase}/watch/${liveId}?sandbox=1`, viewers: 0, sandbox: true };
    }
    return api('POST', '/lives', input, `live:${input.host_livoo_user_id}:${input.title}`);
  },

  async startLive(liveId) { if (livooConfigured) await api('POST', `/lives/${liveId}/start`, {}); },
  async endLive(liveId) { if (livooConfigured) await api('POST', `/lives/${liveId}/end`, {}); },

  // espelha o preço atual do leilão do NoZap (place_bid = fonte de verdade) pro overlay da live
  async putAuctionState(liveId, state) { if (livooConfigured) await api('PUT', `/lives/${liveId}/auction-state`, state); },

  async getWallet(livooUserId) {
    if (!livooConfigured) return { balance_cents: 0, pending_cents: 0, sandbox: true };
    return api('GET', `/users/${livooUserId}/wallet`);
  },

  async createWithdrawal(livooUserId, amountCents, pixKey) {
    if (!livooConfigured) return { status: 'kyc_required' };
    return api('POST', `/users/${livooUserId}/withdrawals`, { amount_cents: amountCents, pix_key: pixKey }, `wd:${livooUserId}:${amountCents}`);
  },
};
