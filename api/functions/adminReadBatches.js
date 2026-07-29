// adminReadBatches — LEITURA de batch_registrations + lotes_recebidos (service_role, bypass RLS)
// para operadores (admin/super_admin OU cargo de estoque). Mesmo padrão de auth do adminReadEntity.js:
// valida o ator por `actorId` no body (este app NÃO usa Supabase Auth — login é próprio via AppUser).
// O frontend chega aqui via base44Adapter.invokeFunction → fetch('/api/functions/adminReadBatches').
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STOCK = ['distribuidor', 'loja_fisica', 'ponto_retirada'];

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const actorId = String(body?.actorId || '').trim();
    if (!actorId) return res.status(400).json({ success: false, error: 'actorId ausente' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    // Valida ator: admin/super_admin OU cargo de estoque (mesma regra do adminReadEntity)
    const actorArr = await (await sb(`app_users?select=id,role,career_levels&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    const ok = actor && (['admin', 'super_admin'].includes(actor.role) || (Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK.includes(c))));
    if (!ok) return res.status(403).json({ success: false, error: 'Sem permissão' });

    // Lê as duas tabelas com service_role (ignora RLS), ordenadas pela mais recente
    const [batchesR, lotesR] = await Promise.all([
      sb('batch_registrations?select=*&order=created_date.desc&limit=200', { method: 'GET' }),
      sb('lotes_recebidos?select=*&order=created_date.desc&limit=200', { method: 'GET' }),
    ]);
    const batches = await batchesR.json().catch(() => []);
    const lotes = await lotesR.json().catch(() => []);

    return res.status(200).json({
      batches: Array.isArray(batches) ? batches : [],
      lotes: Array.isArray(lotes) ? lotes : [],
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}