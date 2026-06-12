// requestWithdrawal — pedido de saque. TRAVA ANTIFRAUDE: só com KYC aprovado e chave PIX = CPF do titular.
// Comprar/ganhar é livre; SACAR exige validação. Reserva o saldo ao pedir.
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round(n * 100) / 100;
const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const userId = String(body?.user_id || '').trim();
    const valor = round2(Number(body?.valor) || 0);
    if (!userId || valor <= 0) return res.status(400).json({ success: false, error: 'Usuário e valor são obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const u = await (await sb(`app_users?select=id,full_name,email,cpf,saldo_disponivel,saldo_alocado,kyc_status&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
    const user = Array.isArray(u) ? u[0] : null;
    if (!user) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });

    // 1) KYC aprovado?
    if (user.kyc_status !== 'aprovado') {
      return res.status(200).json({ success: false, error: 'Você precisa validar sua identidade (KYC) antes de sacar.', need_kyc: true });
    }
    // 2) chave PIX = CPF do titular (trava antifraude)
    const kyc = (await (await sb(`kyc_data?select=pix_key,pix_tipo&user_id=eq.${encodeURIComponent(userId)}&limit=1`)).json())[0];
    const pixKey = onlyDigits(kyc?.pix_key);
    const cpf = onlyDigits(user.cpf);
    if (!kyc || kyc.pix_tipo !== 'cpf' || !pixKey || pixKey !== cpf) {
      return res.status(200).json({ success: false, error: 'O saque só pode ir para uma chave PIX do tipo CPF, igual ao CPF do titular.' });
    }
    // 3) saldo suficiente
    const saldo = round2(Number(user.saldo_disponivel) || 0);
    if (saldo < valor) return res.status(200).json({ success: false, error: `Saldo insuficiente. Disponível: R$ ${saldo.toFixed(2)}` });

    // cria pedido + reserva saldo (disponível → alocado)
    const id = oid();
    await sb('withdrawal_requests', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      id, base44_id: id, user_id: userId, user_name: user.full_name, user_email: user.email,
      valor, pix_key: cpf, pix_tipo: 'cpf', status: 'pending', requested_at: new Date().toISOString(),
    }) });
    await sb(`app_users?id=eq.${userId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      saldo_disponivel: round2(saldo - valor), saldo_alocado: round2((Number(user.saldo_alocado) || 0) + valor),
    }) });

    return res.status(200).json({ success: true, withdrawal_id: id, valor, message: 'Pedido de saque enviado. Será pago no PIX do seu CPF após aprovação.' });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao solicitar saque', details: String(e?.message || e) });
  }
}
