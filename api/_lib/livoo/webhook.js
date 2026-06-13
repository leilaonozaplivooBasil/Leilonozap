// Verifica a assinatura do webhook da Livoo (v2, estilo Stripe):
//   X-Livoo-Signature: t=<ts>,v1=<hmac>  com  v1 == HMAC_SHA256(WEBHOOK_SECRET, `${t}.${raw_body}`)
// Sem secret (sandbox) → true. Janela de replay opcional (≤5min) via toleranceSec.
import crypto from 'crypto';
import { livooConfig } from './config.js';

export function verifyLivooSignature(rawBody, header, toleranceSec = 300) {
  if (!livooConfig.webhookSecret) return true; // sandbox
  if (!header) return false;
  const parts = Object.fromEntries(String(header).split(',').map((s) => s.split('=').map((x) => x.trim())));
  const t = parts.t; const v1 = parts.v1;
  if (!t || !v1) return false;
  if (toleranceSec) { const age = Math.abs(Math.floor(Date.now() / 1000) - Number(t)); if (!Number.isFinite(age) || age > toleranceSec) return false; }
  const expected = crypto.createHmac('sha256', livooConfig.webhookSecret).update(`${t}.${rawBody}`).digest('hex');
  const a = Buffer.from(v1); const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
