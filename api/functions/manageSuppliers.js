// manageSuppliers — CRUD de fornecedores (suppliers) via service_role. action: list|add|remove.
import crypto from 'crypto';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const oid = () => crypto.randomBytes(10).toString('hex');

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const action = String(body?.action || 'list');
    const ownerId = String(body?.ownerId || '').trim();
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    if (action === 'list') {
      const r = await sb(`suppliers?select=*${ownerId ? `&owner_id=eq.${encodeURIComponent(ownerId)}` : ''}&order=created_at.desc`);
      if (r.status === 404) return res.status(200).json({ success: true, suppliers: [], table_missing: true });
      const rows = await r.json();
      return res.status(200).json({ success: true, suppliers: Array.isArray(rows) ? rows : [] });
    }

    const actorId = String(body?.actorId || '').trim();
    const actorArr = await (await sb(`app_users?select=id,role,career_levels&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    const STOCK = ['distribuidor', 'loja_fisica', 'ponto_retirada'];
    const ok = actor && (['admin', 'super_admin'].includes(actor.role) || (Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK.includes(c))));
    if (!ok) return res.status(403).json({ success: false, error: 'Sem permissão' });

    if (action === 'add') {
      const payload = {
        id: oid(), owner_id: ownerId || actorId,
        nome: String(body?.nome || '').trim(),
        cnpj: body?.cnpj || null, contato: body?.contato || null,
        telefone: body?.telefone || null, email: body?.email || null,
        categoria: body?.categoria || null, observacao: body?.observacao || null,
        ativo: true,
      };
      if (!payload.nome) return res.status(400).json({ success: false, error: 'Nome obrigatório' });
      const r = await sb('suppliers', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
      if (r.status === 404) return res.status(200).json({ success: false, table_missing: true, error: 'Tabela suppliers não existe.' });
      const rows = await r.json();
      if (!r.ok) return res.status(200).json({ success: false, error: 'Falha ao salvar', details: JSON.stringify(rows).slice(0, 200) });
      return res.status(200).json({ success: true, supplier: Array.isArray(rows) ? rows[0] : rows });
    }

    if (action === 'remove') {
      const id = String(body?.id || '').trim();
      if (!id) return res.status(400).json({ success: false, error: 'id obrigatório' });
      const r = await sb(`suppliers?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return res.status(200).json({ success: r.ok });
    }

    return res.status(400).json({ success: false, error: 'Ação inválida' });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
