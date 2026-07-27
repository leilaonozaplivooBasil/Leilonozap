// publicRegister — cadastro público simples (service_role, bypassa RLS) a partir da página /Register.
// Sem OTP (mantém a UX atual da tela). Valida duplicados, gera referral_code, resolve o indicador
// pelo ref_code (link de indicação) e grava a senha como bcrypt na tabela isolada app_users_auth.
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

function genReferral(name) {
  const base = String(name || 'user').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '').slice(0, 8) || 'user';
  return base + crypto.randomBytes(2).toString('hex');
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const full_name = String(body?.full_name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const phone = body?.phone ? String(body.phone).replace(/\D/g, '') : '';
    const cpf = body?.cpf ? String(body.cpf).replace(/\D/g, '') : '';
    const ref_code = String(body?.ref_code || '').trim();
    const extra = {
      display_first_name: body?.display_first_name || null,
      display_last_name: body?.display_last_name || null,
      address_street: body?.address_street || null,
      address_number: body?.address_number || null,
      address_complement: body?.address_complement || null,
      address_neighborhood: body?.address_neighborhood || null,
      address_city: body?.address_city || null,
      address_state: body?.address_state || null,
      address_zip_code: body?.address_zip_code ? String(body.address_zip_code).replace(/\D/g, '') : null,
    };

    if (!full_name || !email || !password) return res.status(400).json({ success: false, error: 'Nome, e-mail e senha são obrigatórios' });
    if (password.length < 8) return res.status(400).json({ success: false, error: 'Senha deve ter ao menos 8 caracteres' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // duplicados (e-mail / telefone / cpf)
    const dupOr = [`email.eq.${encodeURIComponent(email)}`];
    if (phone) dupOr.push(`phone.eq.${encodeURIComponent(phone)}`);
    if (cpf) dupOr.push(`cpf.eq.${encodeURIComponent(cpf)}`);
    const existing = await (await sb(`app_users?select=id,email,phone,cpf&or=(${dupOr.join(',')})&limit=5`)).json();
    if (Array.isArray(existing) && existing.length) {
      const hit = existing[0];
      let why = 'USUÁRIO JÁ CADASTRADO.';
      if (hit.email === email) why = 'E-mail já cadastrado.';
      else if (phone && hit.phone === phone) why = 'Telefone já cadastrado.';
      else if (cpf && hit.cpf === cpf) why = 'CPF já cadastrado.';
      return res.status(200).json({ success: false, error: why });
    }

    // resolve indicador pelo ref_code do link
    let referred_by_id = null;
    if (ref_code) {
      const r = await (await sb(`app_users?select=id&referral_code=eq.${encodeURIComponent(ref_code)}&limit=1`)).json();
      if (Array.isArray(r) && r[0]) referred_by_id = r[0].id;
    }

    // referral_code único do novo usuário
    let referral_code = genReferral(full_name);
    for (let i = 0; i < 5; i++) {
      const dup = await (await sb(`app_users?select=id&referral_code=eq.${encodeURIComponent(referral_code)}&limit=1`)).json();
      if (!Array.isArray(dup) || !dup.length) break;
      referral_code = genReferral(full_name);
    }

    const id = oid();
    const now = new Date().toISOString();
    const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    const nameParts = full_name.split(/\s+/).filter(Boolean);
    const payload = {
      id, base44_id: id, full_name, email, password: null,
      phone: phone || null, cpf: cpf || null,
      display_first_name: extra.display_first_name || nameParts[0] || null,
      display_last_name: extra.display_last_name || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : null),
      role: 'user', career_levels: ['usuario'], primary_career_level: 'usuario',
      referred_by_id, referral_code, terms_accepted: true,
      created_date: now, updated_date: now,
      address_street: extra.address_street, address_number: extra.address_number,
      address_complement: extra.address_complement, address_neighborhood: extra.address_neighborhood,
      address_city: extra.address_city, address_state: extra.address_state, address_zip_code: extra.address_zip_code,
    };

    const ins = await sb('app_users', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
    const rows = await ins.json();
    if (!ins.ok || !Array.isArray(rows) || !rows.length) {
      return res.status(200).json({ success: false, error: 'Falha ao criar conta', details: rows });
    }
    // senha em bcrypt na tabela isolada (só service_role lê); app_users.password fica null
    await sb('app_users_auth', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: id, password_hash: hash }) });

    const u = { ...rows[0] };
    delete u.password;
    return res.status(200).json({ success: true, user: u });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao criar conta', details: String(e?.message || e) });
  }
}
