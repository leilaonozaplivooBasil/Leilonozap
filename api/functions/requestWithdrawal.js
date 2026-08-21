// requestWithdrawal — pedido de saque. TRAVA ANTIFRAUDE: só com KYC aprovado e chave PIX = CPF do titular.
// Comprar/ganhar é livre; SACAR exige validação. Reserva o saldo ao pedir.
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';

import { exigirSessao } from '../_lib/sessao.js';
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
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, userId, 'requestWithdrawal');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    const valor = round2(Number(body?.valor) || 0);
    if (!userId || valor <= 0) return res.status(400).json({ success: false, error: 'Usuário e valor são obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const u = await (await sb(`app_users?select=id,full_name,email,cpf,commission_balance,saldo_alocado,kyc_status&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
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
    // ─── 3) saldo suficiente + RESERVA ATÔMICA ────────────────────────────────
    //
    // 🔴 PONTO 101 (21/08/2026) — SACAR O MESMO SALDO VÁRIAS VEZES.
    // A auditoria geral achou aqui uma corrida clássica de perda de escrita.
    // Antes era ler → conferir → gravar, SEM trava nenhuma:
    //
    //   commission_balance: round2(saldo - valor)
    //   saldo_alocado:      round2(alocado + valor)
    //
    // Dois pedidos disparados ao mesmo tempo (dois cliques, duas abas, um
    // script) liam os MESMOS R$ 100, os dois passavam no `saldo < valor`, e os
    // dois gravavam `commission_balance: 0` e `saldo_alocado: 100`. Resultado:
    // DOIS pedidos de R$ 100 na fila, e só R$ 100 debitado. O admin aprovava os
    // dois e saíam R$ 200 de PIX em cima de R$ 100 de saldo.
    //
    // Agora é CAS de verdade: o PATCH só aplica se as DUAS colunas ainda
    // estiverem exatamente como foram lidas. Se alguém mexeu no meio, o laço lê
    // de novo — e na segunda leitura o saldo já não cobre, então o segundo
    // pedido é recusado, que é o certo.
    // Coluna nunca inicializada fica NULL, e "eq.0" nunca casa com NULL — daí o
    // `or(...is.null)` quando o valor lido é 0 (mesmo tratamento do
    // api/_lib/bidHold.js:63).
    //
    // ⚠️ O pedido só é GRAVADO depois que a reserva pegou. Na ordem antiga o
    // withdrawal_request nascia primeiro: se o PATCH falhasse, ficava um pedido
    // órfão na fila do admin, sem lastro nenhum, esperando ser aprovado.
    const id = oid();
    let reservou = false;
    let saldo = 0;
    for (let tentativa = 0; tentativa < 3 && !reservou; tentativa += 1) {
      const fresh = tentativa === 0
        ? user
        : (await (await sb(`app_users?select=commission_balance,saldo_alocado&id=eq.${encodeURIComponent(userId)}&limit=1`)).json())[0];
      if (!fresh) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });

      saldo = round2(Number(fresh.commission_balance) || 0);
      const alocado = round2(Number(fresh.saldo_alocado) || 0);
      if (saldo < valor) {
        return res.status(200).json({ success: false, error: `Saldo insuficiente. Disponível: R$ ${saldo.toFixed(2)}` });
      }

      const fSaldo = saldo === 0 ? 'or(commission_balance.eq.0,commission_balance.is.null)' : `commission_balance.eq.${saldo}`;
      const fAloc = alocado === 0 ? 'or(saldo_alocado.eq.0,saldo_alocado.is.null)' : `saldo_alocado.eq.${alocado}`;
      const patch = await sb(`app_users?id=eq.${encodeURIComponent(userId)}&and=(${fSaldo},${fAloc})`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ commission_balance: round2(saldo - valor), saldo_alocado: round2(alocado + valor) }),
      });
      const linhas = await patch.json().catch(() => []);
      reservou = Array.isArray(linhas) && linhas.length > 0;
    }
    if (!reservou) {
      return res.status(200).json({ success: false, error: 'Seu saldo mudou durante o pedido. Confira e tente de novo.' });
    }

    // Reserva pegou → agora sim o pedido entra na fila do admin.
    await sb('withdrawal_requests', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      id, base44_id: id, user_id: userId, user_name: user.full_name, user_email: user.email,
      valor, pix_key: cpf, pix_tipo: 'cpf', status: 'pending', requested_at: new Date().toISOString(),
    }) });

    return res.status(200).json({ success: true, withdrawal_id: id, valor, message: 'Pedido de saque enviado. Será pago no PIX do seu CPF após aprovação.' });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao solicitar saque', details: String(e?.message || e) });
  }
}
