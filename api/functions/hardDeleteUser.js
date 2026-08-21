// hardDeleteUser — APAGA DE VEZ um cadastro que já está na Lixeira (active=false).
// Diferente de adminUpdateUser({active:false}), aqui o registro sai do banco e não volta.
//
// Travas (nesta ordem, tudo antes de qualquer DELETE):
//   1. quem chama precisa ser admin/super_admin;
//   2. o alvo precisa estar na Lixeira (active === false) — nunca apaga gente ativa;
//   3. o alvo não pode ter ninguém abaixo dele na rede;
//   4. o alvo não pode ter saldo, comissão ou pedido vinculado.
// Se qualquer trava pegar, responde motivo em texto simples e NÃO apaga nada.

import { exigirSessao } from '../_lib/sessao.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

// Existe ao menos 1 registro nessa consulta? Tabela ausente/coluna ausente = não bloqueia.
async function existe(path) {
  try {
    const r = await sb(path);
    if (!r.ok) return false;
    const rows = await r.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

function newId() {
  let out = '';
  const hex = '0123456789abcdef';
  for (let i = 0; i < 24; i++) out += hex[Math.floor(Math.random() * 16)];
  return out;
}

async function writeAudit(entry) {
  try {
    await sb('system_logs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: newId(),
        raw_base44: { kind: 'network_audit', ...entry, at: new Date().toISOString() },
      }),
    });
  } catch (e) {
    console.warn('[hardDeleteUser] auditoria não gravada:', e?.message || e);
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body || typeof body !== 'object') body = {};
    const { userId, actorId } = body;
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, actorId, 'hardDeleteUser');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });

    if (!SUPABASE_URL || !SR) {
      return res.status(500).json({ success: false, error: 'Config do servidor ausente (service role)' });
    }
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId é obrigatório' });
    }
    if (!actorId) {
      return res.status(403).json({ success: false, error: 'Sem credencial de admin' });
    }

    // 1) Guard de admin
    const actorArr = await (await sb(
      `app_users?select=id,role,full_name,email&id=eq.${encodeURIComponent(actorId)}&limit=1`
    )).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    if (!actor || !['admin', 'super_admin'].includes(actor.role)) {
      return res.status(403).json({ success: false, error: 'Apenas admin pode apagar cadastros' });
    }

    // 2) Alvo precisa existir e estar na Lixeira
    const tgtArr = await (await sb(
      `app_users?select=*&id=eq.${encodeURIComponent(userId)}&limit=1`
    )).json();
    const target = Array.isArray(tgtArr) ? tgtArr[0] : null;
    if (!target) {
      return res.status(404).json({ success: false, error: 'Cadastro não encontrado (talvez já tenha sido apagado)' });
    }
    if (target.active !== false) {
      return res.status(400).json({
        success: false,
        blocked: true,
        reasons: ['Este cadastro está ativo. Só é possível apagar de vez quem já está na Lixeira.'],
      });
    }
    if (['admin', 'super_admin'].includes(target.role)) {
      return res.status(400).json({
        success: false,
        blocked: true,
        reasons: ['Este cadastro é de um administrador. Remova o cargo de admin antes de apagar.'],
      });
    }

    // 3) e 4) Travas de vínculo — todas checadas antes de apagar
    const reasons = [];

    if (await existe(`app_users?select=id&referred_by_id=eq.${encodeURIComponent(userId)}&limit=1`)) {
      reasons.push('Ainda existem pessoas indicadas por este cadastro na rede.');
    }

    const saldo =
      Number(target.saldo_disponivel || 0) +
      Number(target.saldo_alocado || 0) +
      Number(target.commission_balance || 0) +
      Number(target.catalog_commission_balance || 0) +
      Number(target.seller_credit_balance || 0);
    if (saldo > 0) {
      reasons.push(`Este cadastro ainda tem saldo de R$ ${saldo.toFixed(2).replace('.', ',')}.`);
    }

    if (await existe(`commission_records?select=id&user_id=eq.${encodeURIComponent(userId)}&limit=1`)) {
      reasons.push('Existem comissões registradas no nome deste cadastro.');
    }
    if (await existe(`catalog_sales?select=id&buyer_id=eq.${encodeURIComponent(userId)}&limit=1`)) {
      reasons.push('Existem pedidos da Loja Virtual feitos por este cadastro.');
    }
    if (await existe(`catalog_sales?select=id&licensee_id=eq.${encodeURIComponent(userId)}&limit=1`)) {
      reasons.push('Existem vendas da Loja Virtual atribuídas a este cadastro.');
    }
    if (await existe(`auctions?select=id&winner_id=eq.${encodeURIComponent(userId)}&limit=1`)) {
      reasons.push('Este cadastro é vencedor de um ou mais leilões.');
    }

    if (reasons.length) {
      return res.status(409).json({ success: false, blocked: true, reasons });
    }

    // Apaga de vez
    const del = await sb(`app_users?id=eq.${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    });
    const deleted = await del.json().catch(() => null);
    if (!del.ok) {
      return res.status(del.status).json({ success: false, error: 'Falha ao apagar', details: deleted });
    }
    if (!Array.isArray(deleted) || deleted.length === 0) {
      return res.status(404).json({ success: false, error: 'Nada foi apagado (cadastro não encontrado)' });
    }

    await writeAudit({
      action: 'purge',
      actor_id: actorId,
      actor_name: actor.full_name || null,
      actor_email: actor.email || null,
      target_id: target.id,
      target_name: target.full_name || null,
      target_email: target.email || null,
    });

    return res.status(200).json({ success: true, deleted_id: target.id, deleted_name: target.full_name || null });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Erro ao apagar', details: String((e && e.message) || e) });
  }
}