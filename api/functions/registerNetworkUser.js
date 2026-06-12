// registerNetworkUser — cadastro REAL (service_role, bypassa RLS) com verificação de código por e-mail.
// Gera referral_code próprio, resolve o indicador, e valida "quem cadastra quem" lendo das tabelas FASE 0.
// Sem link mágico: exige o código de 6 dígitos (purpose 'signup') que foi enviado por e-mail.
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

// valida + consome o código de e-mail (mesma lógica do verifyEmailCode, em 1 passo com o cadastro)
async function consumeCode(email, code) {
  const rows = await (await sb(`email_codes?select=*&email=eq.${encodeURIComponent(email)}&purpose=eq.signup&consumed=eq.false&order=created_at.desc&limit=1`)).json();
  const rec = Array.isArray(rows) ? rows[0] : null;
  if (!rec) return { ok: false, error: 'Nenhum código pendente. Solicite um novo.' };
  const consume = () => sb(`email_codes?id=eq.${rec.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ consumed: true }) });
  if (new Date(rec.expires_at).getTime() < Date.now()) { await consume(); return { ok: false, error: 'Código expirado. Solicite um novo.' }; }
  if (rec.attempts >= 5) { await consume(); return { ok: false, error: 'Muitas tentativas. Solicite um novo código.' }; }
  if (sha(code) !== rec.code_hash) {
    await sb(`email_codes?id=eq.${rec.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ attempts: rec.attempts + 1 }) });
    return { ok: false, error: 'Código incorreto.' };
  }
  await consume();
  return { ok: true };
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
    const phone = String(body?.phone || '').trim();
    const code = String(body?.code || '').trim();
    const ref_code = String(body?.ref_code || '').trim();   // código do indicador (link)
    const as_level = String(body?.as_level || '').trim();   // categoria alvo (quando cadastrado por alguém acima)
    const actor_id = String(body?.actor_id || '').trim();   // quem está cadastrando (logado)
    // campos extras opcionais (cadastro completo)
    const extra = {
      display_first_name: body?.display_first_name || null,
      display_last_name: body?.display_last_name || null,
      cpf: body?.cpf ? String(body.cpf).replace(/\D/g, '') : null,
      address_street: body?.address_street || null,
      address_number: body?.address_number || null,
      address_complement: body?.address_complement || null,
      address_neighborhood: body?.address_neighborhood || null,
      address_city: body?.address_city || null,
      address_state: body?.address_state || null,
      address_zip_code: body?.address_zip_code ? String(body.address_zip_code).replace(/\D/g, '') : null,
    };

    if (!full_name || !email || !password) return res.status(400).json({ success: false, error: 'Nome, e-mail e senha são obrigatórios' });
    if (password.length < 6) return res.status(400).json({ success: false, error: 'Senha deve ter ao menos 6 caracteres' });
    if (!code) return res.status(400).json({ success: false, error: 'Código de verificação obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // 1) valida o código por e-mail
    const v = await consumeCode(email, code);
    if (!v.ok) return res.status(200).json({ success: false, error: v.error });

    // 2) e-mail já cadastrado?
    const existing = await (await sb(`app_users?select=id&email=eq.${encodeURIComponent(email)}&limit=1`)).json();
    if (Array.isArray(existing) && existing.length) return res.status(200).json({ success: false, error: 'Este e-mail já tem cadastro.' });

    // 3) resolve indicador (actor logado tem prioridade; senão o ref_code do link)
    let referred_by_id = null, actorLevel = null;
    if (actor_id) {
      const a = await (await sb(`app_users?select=id,primary_career_level&id=eq.${encodeURIComponent(actor_id)}&limit=1`)).json();
      if (Array.isArray(a) && a[0]) { referred_by_id = a[0].id; actorLevel = a[0].primary_career_level; }
    }
    if (!referred_by_id && ref_code) {
      const r = await (await sb(`app_users?select=id,primary_career_level&referral_code=eq.${encodeURIComponent(ref_code)}&limit=1`)).json();
      if (Array.isArray(r) && r[0]) { referred_by_id = r[0].id; actorLevel = r[0].primary_career_level; }
    }

    // 4) define a categoria do novo usuário
    let level = 'usuario';
    let needsAdesao = null; // cargo pago pendente de pagamento
    if (as_level && as_level !== 'usuario') {
      // precisa que o indicador tenha permissão de cadastrar essa categoria (tabela register_permissions)
      if (!actorLevel) return res.status(200).json({ success: false, error: 'Categoria exige um indicador habilitado.' });
      const perm = await (await sb(`register_permissions?select=can_register_level&actor_level=eq.${encodeURIComponent(actorLevel)}&can_register_level=eq.${encodeURIComponent(as_level)}&limit=1`)).json();
      if (!Array.isArray(perm) || !perm.length) {
        return res.status(200).json({ success: false, error: `Seu cargo (${actorLevel}) não pode cadastrar a categoria "${as_level}".` });
      }
      // 🔒 Cargo PAGO não é concedido de graça pelo link: entra como Usuário e paga a adesão depois (Evoluir).
      const lv = await (await sb(`career_levels?select=adesao_valor&id=eq.${encodeURIComponent(as_level)}&limit=1`)).json();
      const adesao = Array.isArray(lv) && lv[0] ? Number(lv[0].adesao_valor) || 0 : 0;
      if (adesao > 0) { level = 'usuario'; needsAdesao = as_level; }
      else { level = as_level; }
    }

    // 5) referral_code único
    let referral_code = genReferral(full_name);
    for (let i = 0; i < 5; i++) {
      const dup = await (await sb(`app_users?select=id&referral_code=eq.${encodeURIComponent(referral_code)}&limit=1`)).json();
      if (!Array.isArray(dup) || !dup.length) break;
      referral_code = genReferral(full_name);
    }

    const id = oid();
    const now = new Date().toISOString();
    const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    const payload = {
      id, base44_id: id, full_name, email, password: null, phone: phone || null,
      role: 'user', career_levels: [level], primary_career_level: level,
      referred_by_id, referral_code, terms_accepted: true,
      is_seller: ['vendedor'].includes(level) ? true : null,
      created_date: now, updated_date: now,
      ...extra,
    };
    const ins = await sb('app_users', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
    const rows = await ins.json();
    if (!ins.ok || !Array.isArray(rows) || !rows.length) {
      return res.status(200).json({ success: false, error: 'Falha ao criar usuário', details: rows });
    }
    // grava o hash na tabela isolada (só service_role lê) — coluna app_users.password fica vazia
    await sb('app_users_auth', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: id, password_hash: hash }) });
    const u = { ...rows[0] };
    delete u.password; // nunca devolve o hash pro client
    return res.status(200).json({ success: true, user: u, needs_adesao: needsAdesao });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao cadastrar', details: String(e?.message || e) });
  }
}
