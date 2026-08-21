// registerSeller — cadastra um VENDEDOR na equipe de quem clicou (service_role, bypassa RLS).
//
// Pela árvore oficial, o Vendedor ganha 10% na cadeia da venda. Regra de negócio (rebate):
// só quem está ACIMA do Vendedor na linha de REDE pode cadastrá-lo direto (Licenciado pra cima).
// Se quem clicou em "Cadastrar Vendedor" NÃO tem esse nível (ex: é o próprio Vendedor ou um
// Influenciador tentando cadastrar), o cadastro NÃO é bloqueado — ele SOBE para a linha
// ascendente automaticamente, até achar o primeiro cargo que tem permissão (normalmente o
// Licenciado responsável). Isso evita perder o cadastro e mantém o rebate certo.
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
import bcrypt from 'bcryptjs';
import { REDE, bestNetworkLevel } from '../_lib/networkChain.js';
import { exigirSessao } from '../_lib/sessao.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
// ordem de carreira na linha de REDE (usuario=0 ... distribuidor=7) — quem cadastra precisa
// ter ordem MAIOR que a do cargo cadastrado (Vendedor = ordem 2).
const ORDEM_VENDEDOR = REDE.indexOf('vendedor');

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
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, actor_id, 'registerSeller');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    const password = String(body?.password || '');

    if (!full_name) return res.status(200).json({ success: false, error: 'Informe o nome do vendedor.' });
    if (!actor_id) return res.status(200).json({ success: false, error: 'Faça login novamente para cadastrar.' });

    const a = await (await sb(`app_users?select=id,full_name,role,career_levels,primary_career_level,referred_by_id&id=eq.${encodeURIComponent(actor_id)}&limit=1`)).json();
    const actor = Array.isArray(a) ? a[0] : null;
    if (!actor) return res.status(200).json({ success: false, error: 'Faça login novamente para cadastrar.' });

    // 🔼 Resolve quem realmente vai "receber" o vendedor na cadeia: admin cadastra
    // direto; senão sobe a linha ascendente (referred_by_id) até achar o primeiro
    // cargo com ordem MAIOR que Vendedor (normalmente o Licenciado responsável).
    let dono = null;
    if (['admin', 'super_admin'].includes(actor.role)) {
      dono = actor;
    } else {
      let atual = actor;
      const visitados = new Set();
      for (let i = 0; i < 20 && atual && !visitados.has(atual.id); i++) {
        visitados.add(atual.id);
        if (REDE.indexOf(bestNetworkLevel(atual)) > ORDEM_VENDEDOR) { dono = atual; break; }
        if (!atual.referred_by_id) break;
        const up = await (await sb(`app_users?select=id,full_name,role,career_levels,primary_career_level,referred_by_id&id=eq.${encodeURIComponent(atual.referred_by_id)}&limit=1`)).json();
        atual = Array.isArray(up) ? up[0] : null;
      }
    }
    if (!dono) {
      return res.status(200).json({ success: false, error: 'Não foi possível encontrar um Licenciado (ou acima) na sua linha para receber este vendedor.' });
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
      career_levels: ['vendedor'], primary_career_level: 'vendedor', // 💰 é o que faz os 10% caírem pra ele
      is_seller: true,
      referred_by_id: dono.id,                                       // 🔗 amarra em quem tem permissão (subiu a linha se preciso)
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
      ...(dono.id !== actor.id ? { subiu_para: dono.full_name } : {}), // aviso opcional: cadastro subiu para outro cargo
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao cadastrar vendedor', details: String(e?.message || e) });
  }
}