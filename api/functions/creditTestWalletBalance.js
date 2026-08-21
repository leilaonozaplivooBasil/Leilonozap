// creditTestWalletBalance — ADMIN credita saldo de TESTE (test_wallet_balance) em qualquer
// usuário, simulando um depósito, sem tocar em saldo real nem gerar comissão real.
// Só quem tem role admin/super_admin (verificado no banco) pode chamar.
import { exigirSessao } from '../_lib/sessao.js';
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
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { requester_id, target_user_id, amount } = body || {};
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, requester_id, 'creditTestWalletBalance');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    if (!SUPABASE_URL || !SR) return res.status(200).json({ success: false, error: 'Banco não configurado' });
    if (!requester_id || !target_user_id) return res.status(200).json({ success: false, error: 'requester_id e target_user_id são obrigatórios' });
    const value = Number(amount);
    if (!value || value <= 0) return res.status(200).json({ success: false, error: 'Valor inválido' });

    // 🔒 Confirma no banco que quem está chamando é admin (não confia só no front)
    const reqRows = await (await sb(`app_users?select=role&id=eq.${encodeURIComponent(requester_id)}&limit=1`)).json();
    const requester = Array.isArray(reqRows) ? reqRows[0] : null;
    if (!requester || (requester.role !== 'admin' && requester.role !== 'super_admin')) {
      return res.status(200).json({ success: false, error: 'Apenas administradores podem creditar saldo de teste' });
    }

    const targetRows = await (await sb(`app_users?select=id,test_wallet_balance&id=eq.${encodeURIComponent(target_user_id)}&limit=1`)).json();
    const target = Array.isArray(targetRows) ? targetRows[0] : null;
    if (!target) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });

    const newBalance = Number(target.test_wallet_balance || 0) + value;
    await sb(`app_users?id=eq.${encodeURIComponent(target_user_id)}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ test_wallet_balance: newBalance }),
    });

    return res.status(200).json({ success: true, new_balance: newBalance });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao creditar saldo de teste', details: String(e?.message || e) });
  }
}