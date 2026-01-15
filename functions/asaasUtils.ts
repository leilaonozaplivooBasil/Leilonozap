import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export async function getSettings(base44) {
  const list = await base44.asServiceRole.entities.AsaasAppSettings.list('-updated_date', 1);
  const settings = Array.isArray(list) && list.length > 0 ? list[0] : null;

  const preferredEnv = settings?.asaasEnvironment || 'SANDBOX';
  const sandboxKey = Deno.env.get('ASAAS_API_KEY_SANDBOX');
  const prodKey = Deno.env.get('ASAAS_API_KEY_PRODUCTION');

  let env = preferredEnv;
  let apiKey = env === 'PRODUCTION' ? prodKey : sandboxKey;

  // Fallback: se a chave do ambiente preferido não existir, use a disponível
  if (!apiKey) {
    if (env === 'SANDBOX' && prodKey) {
      env = 'PRODUCTION';
      apiKey = prodKey;
    } else if (env === 'PRODUCTION' && sandboxKey) {
      env = 'SANDBOX';
      apiKey = sandboxKey;
    }
  }

  if (!apiKey) {
    throw new Error(`Asaas API key not set. Set ASAAS_API_KEY_PRODUCTION or ASAAS_API_KEY_SANDBOX.`);
  }

  const baseUrl = env === 'PRODUCTION' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';
  const userAgent = settings?.asaasUserAgent || 'Base44-App';

  return { settings, env, baseUrl, userAgent, apiKey };
}

export function normalizeStatus(asaasStatus) {
  const s = (asaasStatus || '').toUpperCase();
  if (['RECEIVED', 'RECEIVED_IN_CASH', 'CONFIRMED', 'APPROVED'].includes(s)) return 'PAID';
  if (['PENDING', 'AWAITING_RISK_ANALYSIS'].includes(s)) return 'AWAITING_PAYMENT';
  if (['CANCELLED', 'CANCELED'].includes(s)) return 'CANCELED';
  if (['OVERDUE', 'REFUNDED', 'CHARGEBACK', 'FAILED'].includes(s)) return 'FAILED';
  if (['EXPIRED'].includes(s)) return 'EXPIRED';
  return 'PENDING';
}

export async function asaasFetch(baseUrl, apiKey, userAgent, path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': userAgent,
    'access_token': apiKey,
    ...(options.headers || {})
  };
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) {}
  if (!res.ok) {
    const msg = json?.errors?.[0]?.description || json?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.response = json;
    throw err;
  }
  return json;
}