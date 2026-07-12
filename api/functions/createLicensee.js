// createLicensee — cria um LICENCIADO (app_users) com service_role, bypassando RLS.
// Motivo: o app usa só a anon key e app_users tem RLS sem INSERT p/ anon → AppUser.create()
// falhava (42501) e o modal travava em "Salvando...". Esta rota resolve os DOIS fluxos:
//   • Admin cadastrando vendedor/licenciado (painel "Loja Virtual do Vendedor") — exige actor admin.
//   • Auto-cadastro público de licenciado (link viral "Cadastro de Licenciado") — sem login.
// Sempre força role='licensee' (o client NUNCA escolhe o papel). Senha vai como hash em app_users_auth.
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STOCK = ['distribuidor', 'loja_fisica', 'ponto_retirada'];

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

function genReferral(name) {
  const base = String(name || 'user').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '').slice(0, 8) || 'user';
  return base + crypto.randomBytes(2).toString('hex');
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const full_name = String(body?.full_name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const phone = String(body?.phone || '').trim();
    const nickname = String(body?.nickname || '').trim() || null;
    const store_name = String(body?.store_name || '').trim() || null;
    const avatar_url = body?.avatar_url || null;
    const cpf = body?.cpf ? String(body.cpf).replace(/\D/g, '') : null;
    const level = String(body?.career_level || 'licenciado_aplicativo').trim() || 'licenciado_aplicativo';
    const actor_id = String(body?.actor_id || '').trim();     // admin logado (fluxo painel)
    const ref_code = String(body?.ref_code || '').trim();     // código do indicador (link viral)
    let referred_by_id = body?.referred_by_id ? String(body.referred_by_id) : null;

    if (!full_name) return res.status(200).json({ success: false, error: 'Nome é obrigatório.' });
    if (password && password.length < 6) return res.status(200).json({ success: false, error: 'Senha deve ter ao menos 6 caracteres.' });

    // Guard do fluxo ADMIN: se veio actor_id, precisa ser admin/super_admin OU cargo de estoque.
    if (actor_id) {
      const a = await (await sb(`app_users?select=id,role,career_levels&id=eq.${encodeURIComponent(actor_id)}&limit=1`)).json();
      const actor = Array.isArray(a) ? a[0] : null;
      const ok = actor && (['admin', 'super_admin'].includes(actor.role) || (Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK.includes(c))));
      if (!ok) return res.status(200).json({ success: false, error: 'Sem permissão para cadastrar licenciado.' });
    }

    // e-mail duplicado (só valida se veio e-mail)
    if (email) {
      const existing = await (await sb(`app_users?select=id&email=eq.${encodeURIComponent(email)}&limit=1`)).json();
      if (Array.isArray(existing) && existing.length) return res.status(200).json({ success: false, error: 'Este e-mail já tem cadastro.' });
    }

    // resolve indicador pelo código do link (se não veio referred_by_id explícito)
    if (!referred_by_id && ref_code) {
      const r = await (await sb(`app_users?select=id&referral_code=eq.${encodeURIComponent(ref_code)}&limit=1`)).json();
      if (Array.isArray(r) && r[0]) referred_by_id = r[0].id;
    }

    // referral_code próprio único (usa o sugerido se livre; senão gera)
    let referral_code = String(body?.referral_code || '').trim() || genReferral(full_name);
    for (let i = 0; i < 6; i++) {
      const dup = await (await sb(`app_users?select=id&referral_code=eq.${encodeURIComponent(referral_code)}&limit=1`)).json();
      if (!Array.isArray(dup) || !dup.length) break;
      referral_code = genReferral(full_name);
    }

    const id = oid();
    const now = new Date().toISOString();
    const payload = {
      id, base44_id: id, full_name, email: email || null, password: null, phone: phone || null,
      nickname, store_name, avatar_url, cpf,
      role: 'licensee', career_levels: [level], primary_career_level: level,
      referred_by_id, referral_code, terms_accepted: true,
      points: 0, total_bids: 0, won_auctions: 0, indicated_clients_count: 0, network_bids_count: 0,
      commission_balance: 0, created_date: now, updated_date: now,
    };
    const ins = await sb('app_users', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
    const rows = await ins.json();
    if (!ins.ok || !Array.isArray(rows) || !rows.length) {
      return res.status(200).json({ success: false, error: 'Falha ao criar licenciado', details: JSON.stringify(rows).slice(0, 200) });
    }
    // senha (opcional) → hash na tabela isolada; app_users.password fica vazio
    if (password) {
      const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
      await sb('app_users_auth', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: id, password_hash: hash }) });
    }
    const u = { ...rows[0] };
    delete u.password;
    return res.status(200).json({ success: true, user: u });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao cadastrar licenciado', details: String(e?.message || e) });
  }
}
