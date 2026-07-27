// manageCoupons — CRUD de cupons pro admin (lista, cria, ativa/desativa, exclui). Via service_role.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });
    const action = String(body?.action || 'list');

    if (action === 'list') {
      const rows = await (await sb('coupons?select=*&order=created_at.desc&limit=200')).json();
      return res.status(200).json({ success: true, coupons: Array.isArray(rows) ? rows : [] });
    }

    if (action === 'create') {
      const code = String(body?.code || '').trim().toUpperCase();
      const tipo = body?.tipo === 'fixed' ? 'fixed' : 'percent';
      const valor = Number(body?.valor);
      if (!code) return res.status(200).json({ success: false, error: 'Informe o código' });
      if (!(valor > 0)) return res.status(200).json({ success: false, error: 'Valor inválido' });
      if (tipo === 'percent' && valor > 100) return res.status(200).json({ success: false, error: 'Percentual máximo 100' });
      const payload = {
        code, tipo, valor,
        min_order: body?.min_order ? Number(body.min_order) : 0,
        validade: body?.validade || null,
        uso_max: body?.uso_max ? parseInt(body.uso_max, 10) : null,
        seller_id: body?.seller_id || null,
        descricao: body?.descricao || null,
        active: body?.active !== false,
      };
      const r = await sb('coupons', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
      if (!r.ok) { const t = await r.text(); return res.status(200).json({ success: false, error: t.includes('duplicate') ? 'Já existe um cupom com esse código' : 'Falha ao criar', details: t.slice(0, 160) }); }
      const rows = await r.json();
      return res.status(200).json({ success: true, coupon: rows?.[0] });
    }

    if (action === 'toggle') {
      const id = String(body?.id || '');
      if (!id) return res.status(200).json({ success: false, error: 'id obrigatório' });
      await sb(`coupons?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ active: !!body?.active }) });
      return res.status(200).json({ success: true });
    }

    if (action === 'delete') {
      const id = String(body?.id || '');
      if (!id) return res.status(200).json({ success: false, error: 'id obrigatório' });
      await sb(`coupons?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Ação inválida' });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
