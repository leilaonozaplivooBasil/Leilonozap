// 🚦 rateLimit — limite de tentativas por chave (auditoria 15/09/2026).
// Usa a RPC public.rate_limit_hit (migração auditoria_rate_limit). Falha ABERTA:
// se o banco não responder, a rota segue — o limite é proteção contra abuso,
// nunca pode virar porta fechada pra cliente honesto.
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function ipDoRequest(req) {
  const xf = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || String(req?.headers?.['x-real-ip'] || req?.socket?.remoteAddress || 'ip?');
}

/** true = BLOQUEADO (passou de `max` chamadas dentro de `janelaSeg`). */
export async function estourouLimite(chave, max, janelaSeg) {
  try {
    if (!SUPABASE_URL || !SR) return false;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rate_limit_hit`, {
      method: 'POST',
      headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ _chave: String(chave).slice(0, 200), _max: max, _janela_seg: janelaSeg }),
    });
    if (!r.ok) return false;
    const v = await r.json().catch(() => false);
    return v === true;
  } catch {
    return false;
  }
}
