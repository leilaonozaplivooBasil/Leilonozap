// loteRecebidoWrite (rota Vercel) — escrita segura de LoteRecebido (painel Estoque de Lotes)
// CONTRA O SUPABASE REAL, via service_role.
//
// POR QUE ESTA ROTA EXISTE (causa-raiz da falha reportada):
// o front chama base44.functions.invoke('loteRecebidoWrite', ...), que no adapter faz
// fetch('/api/functions/loteRecebidoWrite'). Existia só a Base44 Function (Deno), que o
// Vercel/preview NÃO serve → o fetch caía em 404/405 e o adapter devolvia
// { ok:false, error:'not_implemented' }, então a exclusão/arremate nunca chegava no banco.
// Esta rota Node é o caminho que o app de fato usa (mesmo padrão de adminEntityWrite.js).
//
// A tabela lotes_recebidos tem RLS write = admin-only; o service_role ignora RLS, por isso
// validamos o admin aqui (caller_email na tabela app_users) antes de qualquer escrita.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Normaliza a URL: remove /rest/v1 e barras finais pra não duplicar caminho.
function baseUrl() {
  return String(SUPABASE_URL || '').replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
}
function sb(path, opts = {}) {
  return fetch(`${baseUrl()}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ error: 'Config ausente (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' });

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { method, id, data, caller_email } = body || {};

    if (!method) return res.status(400).json({ error: 'method é obrigatório' });

    // SEGURANÇA: valida admin/super_admin via caller_email (login custom, sem sessão de auth).
    if (!caller_email) return res.status(403).json({ error: 'Não autorizado - caller_email ausente' });
    const users = await sb(`app_users?email=eq.${encodeURIComponent(caller_email)}&select=role&limit=1`).then((r) => r.json()).catch(() => []);
    const role = Array.isArray(users) && users[0] ? users[0].role : null;
    if (role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ error: 'Não autorizado - apenas admin' });
    }

    if (method === 'create') {
      const r = await sb('lotes_recebidos', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(data || {}),
      });
      const rows = await r.json().catch(() => null);
      if (!r.ok) return res.status(500).json({ error: `Falha ao criar (${r.status})`, details: rows });
      return res.status(200).json({ data: Array.isArray(rows) ? rows[0] : rows });
    }

    if (method === 'update') {
      if (!id) return res.status(400).json({ error: 'id é obrigatório para update' });
      const r = await sb(`lotes_recebidos?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(data || {}),
      });
      const rows = await r.json().catch(() => null);
      if (!r.ok) return res.status(500).json({ error: `Falha ao atualizar (${r.status})`, details: rows });
      return res.status(200).json({ data: Array.isArray(rows) ? rows[0] : rows });
    }

    if (method === 'delete') {
      if (!id) return res.status(400).json({ error: 'id é obrigatório para delete' });
      const r = await sb(`lotes_recebidos?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!r.ok) {
        const details = await r.text().catch(() => '');
        return res.status(500).json({ error: `Falha ao excluir (${r.status})`, details: details.slice(0, 300) });
      }
      return res.status(200).json({ data: { deleted: true } });
    }

    return res.status(400).json({ error: `Método '${method}' não suportado. Use 'create', 'update' ou 'delete'` });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}