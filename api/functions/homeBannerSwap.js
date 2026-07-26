// homeBannerSwap — manutenção dos banners rotativos (banner_images) protegida por DIAG_KEY.
// A RLS bloqueia escrita anônima na tabela, então a troca de arte passa por aqui,
// com a service role do servidor. Nunca devolve credenciais.
// Ops:
//   list → linhas de um contexto (default 'home')
//   set  → atualiza image_url por base44_id: { updates: [{ base44_id, image_url }] }

const URL_BASE = process.env.VITE_SUPABASE_URL || 'https://gezvviyegtxytnwjkrjv.supabase.co';
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

const rest = async (path, opts = {}) => {
  const r = await fetch(`${URL_BASE}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  });
  const json = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, json };
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    if (!process.env.DIAG_KEY || body.key !== process.env.DIAG_KEY) return res.status(403).json({ error: 'forbidden' });
    if (!SR) return res.status(500).json({ error: 'service role ausente' });
    const op = String(body.op || 'list');

    if (op === 'list') {
      const ctx = String(body.context || 'home');
      const r = await rest(`/banner_images?context=eq.${encodeURIComponent(ctx)}&select=base44_id,title,image_url,device_type,is_active,sort_order`);
      return res.status(r.ok ? 200 : 502).json(r);
    }

    if (op === 'set') {
      const updates = Array.isArray(body.updates) ? body.updates : [];
      if (!updates.length) return res.status(400).json({ error: 'updates vazio' });
      const results = [];
      for (const u of updates) {
        if (!u?.base44_id || !u?.image_url) { results.push({ erro: 'base44_id/image_url obrigatórios', u }); continue; }
        const r = await rest(`/banner_images?base44_id=eq.${encodeURIComponent(u.base44_id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ image_url: u.image_url }),
        });
        results.push({ base44_id: u.base44_id, ok: r.ok, status: r.status, rows: Array.isArray(r.json) ? r.json.length : 0 });
      }
      return res.status(200).json({ results });
    }

    if (op === 'storage_delete') {
      const paths = Array.isArray(body.paths) ? body.paths.filter((p) => typeof p === 'string') : [];
      if (!paths.length) return res.status(400).json({ error: 'paths vazio' });
      const r = await fetch(`${URL_BASE}/storage/v1/object/public-assets`, {
        method: 'DELETE',
        headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: paths }),
      });
      const json = await r.json().catch(() => null);
      return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, json });
    }

    return res.status(400).json({ error: `op desconhecida: ${op}` });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
