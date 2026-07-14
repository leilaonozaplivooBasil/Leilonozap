// registerSeller — o LICENCIADO cadastra um VENDEDOR da equipe dele (service_role, bypassa RLS).
//
// Pela árvore oficial, o Vendedor ganha 5% na cadeia da venda. Só que essa rota NUNCA EXISTIU:
// o botão "Cadastrar Vendedor" chamava uma função inexistente, então ninguém no sistema tinha o
// cargo e os 5% do vendedor iam TODOS pra empresa em toda venda. Agora o fluxo funciona.
//
// O vendedor nasce vinculado a quem o cadastrou (referred_by_id), que é o que faz a comissão
// subir a cadeia: venda do vendedor → licenciado → parceiro → ... → topo.
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
// quem pode cadastrar vendedor: licenciado pra cima (+ admin)
const PODE_CADASTRAR = ['licenciado', 'licenciado_catalogo', 'licenciado_aplicativo', 'parceiro',
  'ponto_retirada', 'loja_fisica', 'distribuidor', 'ceo', 'fundador', 'conselheiro',
  'diretoria_executiva', 'diretoria_operacao', 'executivo', 'embaixador'];

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}
const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const genReferral = (nome) => {
  const base = slug(nome).replace(/-/g, '').slice(0, 8) || 'vend';
  return base + crypto.randomBytes(2).toString('hex');
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const full_name = String(body?.full_name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const phone = String(body?.phone || '').replace(/\D/g, '');
    const cpf = String(body?.cpf || '').replace(/\D/g, '');
    const store_name = String(body?.store_name || '').trim() || null;
    const avatar_url = body?.avatar_url || null;
    const actor_id = String(body?.actor_id || '').trim();
    const password = String(body?.password || '');

    if (!full_name) return res.status(200).json({ success: false, error: 'Informe o nome do vendedor.' });
    if (!actor_id) return res.status(200).json({ success: false, error: 'Faça login novamente para cadastrar.' });

    // guard: quem cadastra precisa ser licenciado (ou acima) / admin
    const a = await (await sb(`app_users?select=id,full_name,role,career_levels&id=eq.${encodeURIComponent(actor_id)}&limit=1`)).json();
    const actor = Array.isArray(a) ? a[0] : null;
    const podeAdmin = actor && ['admin', 'super_admin'].includes(actor.role);
    const podeCargo = actor && Array.isArray(actor.career_levels) && actor.career_levels.some((c) => PODE_CADASTRAR.includes(c));
    if (!actor || (!podeAdmin && !podeCargo)) {
      return res.status(200).json({ success: false, error: 'Só um Licenciado (ou acima) pode cadastrar vendedor.' });
    }

    // duplicados
    const orDup = [];
    if (email) orDup.push(`email.eq.${encodeURIComponent(email)}`);
    if (cpf) orDup.push(`cpf.eq.${encodeURIComponent(cpf)}`);
    if (orDup.length) {
      const dup = await (await sb(`app_users?select=id,email,cpf&or=(${orDup.join(',')})&limit=1`)).json();
      if (Array.isArray(dup) && dup.length) {
        return res.status(200).json({ success: false, error: 'Já existe uma conta com esse e-mail ou CPF.' });
      }
    }

    // referral_code + slug da loja únicos
    let referral_code = genReferral(full_name);
    for (let i = 0; i < 6; i++) {
      const d = await (await sb(`app_users?select=id&referral_code=eq.${encodeURIComponent(referral_code)}&limit=1`)).json();
      if (!Array.isArray(d) || !d.length) break;
      referral_code = genReferral(full_name);
    }
    let store_slug = slug(store_name || full_name) || referral_code;
    for (let i = 0; i < 6; i++) {
      const d = await (await sb(`app_users?select=id&store_slug=eq.${encodeURIComponent(store_slug)}&limit=1`)).json();
      if (!Array.isArray(d) || !d.length) break;
      store_slug = `${store_slug}-${crypto.randomBytes(1).toString('hex')}`;
    }

    const id = oid();
    const now = new Date().toISOString();
    const payload = {
      id, base44_id: id, full_name, email: email || null, password: null, phone: phone || null, cpf: cpf || null,
      role: 'user',
      career_levels: ['vendedor'], primary_career_level: 'vendedor', // 💰 é o que faz os 5% caírem pra ele
      is_seller: true,
      referred_by_id: actor.id,                                      // 🔗 amarra na cadeia de quem cadastrou
      referral_code, store_name, store_slug, avatar_url,
      terms_accepted: true, commission_balance: 0, saldo_disponivel: 0, saldo_alocado: 0,
      created_date: now, updated_date: now,
    };
    const ins = await sb('app_users', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
    const rows = await ins.json();
    if (!ins.ok || !Array.isArray(rows) || !rows.length) {
      return res.status(200).json({ success: false, error: 'Falha ao cadastrar vendedor', details: JSON.stringify(rows).slice(0, 200) });
    }
    if (password && password.length >= 6) {
      const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
      await sb('app_users_auth', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: id, password_hash: hash }) });
    }

    const seller = { ...rows[0] };
    delete seller.password;
    return res.status(200).json({
      success: true,
      seller,
      store_link: `https://leilaonozap.net/loja/${store_slug}`,
      ref_link: `https://leilaonozap.net/Loja-Virtual?ref=${referral_code}`,
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao cadastrar vendedor', details: String(e?.message || e) });
  }
}
