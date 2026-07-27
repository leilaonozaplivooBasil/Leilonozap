// manageEmployees — funcionários de balcão (PDV) do distribuidor. action: list|add|remove|toggle.
// Cria app_user com is_pdv_operator=true + employer_id + senha (app_users_auth). Guard: ator admin/super_admin.
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
import bcrypt from 'bcryptjs';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    const employerId = String(body?.employerId || '').trim();
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    if (action === 'list') {
      const r = await sb(`app_users?select=id,full_name,email,is_pdv_operator,active,created_date&is_pdv_operator=eq.true${employerId ? `&employer_id=eq.${encodeURIComponent(employerId)}` : ''}&order=created_date.desc`);
      const rows = await r.json();
      return res.status(200).json({ success: true, employees: Array.isArray(rows) ? rows : [] });
    }

    // escrita: ator admin/super_admin OU dono com cargo de estoque (distribuidor/loja/ponto)
    const actorId = String(body?.actorId || '').trim();
    const actorArr = await (await sb(`app_users?select=id,role,career_levels&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    const STOCK = ['distribuidor', 'loja_fisica', 'ponto_retirada'];
    const ok = actor && (['admin', 'super_admin'].includes(actor.role) || (Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK.includes(c))));
    if (!ok) return res.status(403).json({ success: false, error: 'Sem permissão' });

    if (action === 'add') {
      const full_name = String(body?.full_name || '').trim();
      const email = String(body?.email || '').trim().toLowerCase();
      const password = String(body?.password || '');
      if (!full_name || !email || password.length < 6) return res.status(400).json({ success: false, error: 'Nome, e-mail e senha (mín. 6) obrigatórios' });
      const exists = await (await sb(`app_users?select=id&email=eq.${encodeURIComponent(email)}&limit=1`)).json();
      if (Array.isArray(exists) && exists.length) return res.status(200).json({ success: false, error: 'Este e-mail já tem cadastro.' });

      const id = oid(); const now = new Date().toISOString();
      const payload = {
        id, base44_id: id, full_name, email, password: null, role: 'user',
        is_pdv_operator: true, employer_id: employerId || actorId, active: true,
        career_levels: ['funcionario'], primary_career_level: 'funcionario',
        created_date: now, updated_date: now,
      };
      const r = await sb('app_users', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
      const rows = await r.json();
      if (!r.ok || !Array.isArray(rows) || !rows.length) return res.status(200).json({ success: false, error: 'Falha ao criar', details: JSON.stringify(rows).slice(0, 200) });
      const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
      await sb('app_users_auth', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: id, password_hash: hash }) });
      const u = { ...rows[0] }; delete u.password;
      return res.status(200).json({ success: true, employee: u });
    }

    if (action === 'remove') {
      const id = String(body?.id || '').trim();
      if (!id) return res.status(400).json({ success: false, error: 'id obrigatório' });
      // só remove se for mesmo um operador de PDV (segurança)
      await sb(`app_users?id=eq.${encodeURIComponent(id)}&is_pdv_operator=eq.true`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      await sb(`app_users_auth?user_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return res.status(200).json({ success: true });
    }

    if (action === 'toggle') {
      const id = String(body?.id || '').trim();
      const active = !!body?.active;
      if (!id) return res.status(400).json({ success: false, error: 'id obrigatório' });
      await sb(`app_users?id=eq.${encodeURIComponent(id)}&is_pdv_operator=eq.true`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ active }) });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Ação inválida' });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
