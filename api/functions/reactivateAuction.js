// reactivateAuction — admin reativa leilão finalizado (PATCH via service role key, bypassa RLS)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

async function isAdmin(actorId) {
  if (!actorId) return false;
  const a = (await (await sb(`app_users?select=role&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json())[0];
  return a && ['admin', 'super_admin'].includes(a.role);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { actor_id, auctionId, payload } = body || {};

    if (!auctionId || !payload) return res.status(400).json({ success: false, error: 'auctionId e payload são obrigatórios' });
    if (!await isAdmin(actor_id)) return res.status(403).json({ success: false, error: 'Apenas admin pode reativar leilão' });

    const resp = await sb(`auctions?id=eq.${encodeURIComponent(auctionId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({ success: false, error: data?.message || 'Falha ao atualizar leilão no Supabase' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'Leilão não encontrado ou update não efetivado' });
    }

    return res.status(200).json({ success: true, message: 'Leilão reativado com sucesso', auction: data[0] });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}