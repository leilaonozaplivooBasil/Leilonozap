// payCommissionManually — admin paga comissão por fora (PIX na mão) e desconta
// do saldo real, na mesma operação. Ver src/lib/pagamentoManualDeComissao.js
// pra explicação completa e supabase/migrations/…_pagamento_manual_de_comissao.sql
// pra por que a tabela do histórico não aceita escrita direta do navegador.
import { oid } from '../_lib/oid.js';
import { exigirSessao } from '../_lib/sessao.js';
import { enviarAviso } from '../_lib/avisosPorEmail.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round(n * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

async function lerAdmin(actorId) {
  if (!actorId) return null;
  const a = (await (await sb(`app_users?select=id,full_name,role&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json())[0];
  return a && ['admin', 'super_admin'].includes(a.role) ? a : null;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { actor_id, user_id, valor, pix_key_usada, nota, commission_ids } = body || {};
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    const _ses = exigirSessao(req, actor_id, 'payCommissionManually');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    let v = round2(Number(valor) || 0);
    // ✅ 28/09/2026 — pagar POR LINHA (pedido da Beatriz): com `commission_ids`,
    // o valor é a soma DAQUELAS linhas, calculada aqui — nunca o número que veio
    // do navegador. Ver src/lib/pagamentoManualDeComissao.js.
    const porLinha = Array.isArray(commission_ids) && commission_ids.length > 0;
    const ids = porLinha ? [...new Set(commission_ids.map(String).filter((i) => /^[A-Za-z0-9_-]{1,64}$/.test(i)))] : [];
    if (porLinha && (ids.length !== commission_ids.length || ids.length > 500)) {
      return res.status(400).json({ success: false, error: 'Lista de comissões inválida' });
    }
    if (!user_id || (!porLinha && v <= 0)) return res.status(400).json({ success: false, error: 'Parâmetros inválidos' });
    if (!String(pix_key_usada || '').trim()) return res.status(400).json({ success: false, error: 'Informe a chave PIX (ou outro dado) usada no pagamento' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const admin = await lerAdmin(actor_id);
    if (!admin) return res.status(403).json({ success: false, error: 'Apenas admin pode pagar comissão manualmente' });

    // ─── POR LINHA: reserva as linhas ANTES de mexer no saldo ────────────────
    // As linhas viram 'paid' só se AINDA estão pagáveis (filtro de status no
    // próprio PATCH). Se alguma já tinha sido paga por outra pessoa no meio do
    // caminho, as reservadas voltam ao status de antes e nada é descontado.
    const lista = ids.map((i) => `"${i}"`).join(',');
    let estadoAntes = [];
    const devolverLinhas = async () => {
      for (const st of ['pending', 'confirmed']) {
        const volta = estadoAntes.filter((l) => l.status === st).map((l) => `"${l.id}"`).join(',');
        if (!volta) continue;
        await sb(`commission_records?id=in.(${encodeURIComponent(volta)})&status=eq.paid`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: st }),
        }).catch(() => {});
      }
    };
    if (porLinha) {
      estadoAntes = await (await sb(`commission_records?select=id,user_id,amount,status&id=in.(${encodeURIComponent(lista)})`)).json().catch(() => []);
      if (!Array.isArray(estadoAntes) || estadoAntes.length !== ids.length) {
        return res.status(200).json({ success: false, error: 'Alguma comissão selecionada não foi encontrada. Recarregue a tela.' });
      }
      if (estadoAntes.some((l) => String(l.user_id) !== String(user_id))) {
        return res.status(400).json({ success: false, error: 'Comissão de outra pessoa na seleção' });
      }
      if (estadoAntes.some((l) => !['pending', 'confirmed'].includes(l.status))) {
        return res.status(200).json({ success: false, error: 'Alguma comissão selecionada já foi paga ou estornada. Recarregue a tela.' });
      }
      // DIR-201: linha negativa (comissão usada em compra na loja) não se paga
      if (estadoAntes.some((l) => !(Number(l.amount) > 0))) {
        return res.status(400).json({ success: false, error: 'Linha de uso em compra não é pagável.' });
      }
      const soma = round2(estadoAntes.reduce((s, l) => s + (Number(l.amount) || 0), 0));
      // a tela mostrou um total; se o banco diz outro, a tela está velha
      if (Number(valor) > 0 && Math.abs(round2(Number(valor)) - soma) >= 0.01) {
        return res.status(200).json({ success: false, error: `O total mudou (agora R$ ${soma.toFixed(2)}). Recarregue a tela.` });
      }
      if (soma <= 0) return res.status(400).json({ success: false, error: 'Parâmetros inválidos' });
      v = soma;
      const reserva = await sb(`commission_records?id=in.(${encodeURIComponent(lista)})&user_id=eq.${encodeURIComponent(user_id)}&status=in.(pending,confirmed)`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'paid' }),
      });
      const reservadas = await reserva.json().catch(() => []);
      if (!Array.isArray(reservadas) || reservadas.length !== ids.length) {
        // devolve só as que ESTA chamada reservou (o PATCH é um comando só: ou
        // voltou a lista do que mudou, ou deu erro e nada mudou)
        const minhas = new Set(Array.isArray(reservadas) ? reservadas.map((r) => String(r.id)) : []);
        estadoAntes = estadoAntes.filter((l) => minhas.has(String(l.id)));
        await devolverLinhas();
        return res.status(200).json({ success: false, error: 'Alguma comissão foi paga por outra pessoa agora mesmo. Recarregue a tela.', raced: true });
      }
    }

    // ─── DÉBITO ATÔMICO ─────────────────────────────────────────────────────
    // Mesmo padrão CAS do saque (requestWithdrawal.js): lê, confere, grava só
    // se a coluna continuar EXATAMENTE como foi lida. Se mudou no meio (outro
    // pagamento, um saque, uma nova comissão chegando), relê e tenta de novo —
    // nunca desconta em cima de um número que já ficou velho.
    let debitou = false;
    let saldoAntes = 0;
    let saldoDepois = 0;
    let userName = '';
    for (let tentativa = 0; tentativa < 3 && !debitou; tentativa += 1) {
      const fresh = (await (await sb(`app_users?select=full_name,commission_balance&id=eq.${encodeURIComponent(user_id)}&limit=1`)).json())[0];
      if (!fresh) { await devolverLinhas(); return res.status(200).json({ success: false, error: 'Pessoa não encontrada' }); }
      userName = fresh.full_name || '';
      saldoAntes = round2(Number(fresh.commission_balance) || 0);
      if (saldoAntes < v) {
        await devolverLinhas();
        return res.status(200).json({ success: false, error: `Saldo insuficiente. Disponível: R$ ${saldoAntes.toFixed(2)}` });
      }
      saldoDepois = round2(saldoAntes - v);
      const filtro = saldoAntes === 0 ? 'or(commission_balance.eq.0,commission_balance.is.null)' : `commission_balance.eq.${saldoAntes}`;
      const patch = await sb(`app_users?id=eq.${encodeURIComponent(user_id)}&${filtro}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ commission_balance: saldoDepois }),
      });
      const linhas = await patch.json().catch(() => []);
      debitou = Array.isArray(linhas) && linhas.length > 0;
    }
    if (!debitou) {
      await devolverLinhas();
      return res.status(200).json({ success: false, error: 'O saldo mudou durante o pagamento. Confira o valor atual e tente de novo.', raced: true });
    }

    // O débito já pegou — o registro é só o comprovante do que aconteceu.
    // Se o insert falhar, o dinheiro JÁ SAIU do saldo (certo: o PIX já foi
    // pago de verdade, é isso que o débito representa) — só falta o rastro
    // escrito, então grita no log pra alguém completar na mão.
    const id = oid();
    const ins = await sb('comissao_pagamentos_manuais', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id, user_id, user_name: userName, valor: v, saldo_antes: saldoAntes, saldo_depois: saldoDepois,
        pix_key_usada: String(pix_key_usada).trim(), nota: nota ? String(nota).trim() : null,
        pago_por_id: admin.id, pago_por_nome: admin.full_name || '',
        ...(porLinha ? { commission_ids: ids } : {}),
      }),
    });
    if (!ins.ok) {
      const detalhe = await ins.text().catch(() => '');
      console.error(`[COMISSAO] pagamento manual SEM REGISTRO — user ${user_id}, R$ ${v}, pago por ${admin.id}:`, detalhe.slice(0, 300));
    }

    await enviarAviso({ tipo: 'comissao_paga_manual', userId: user_id, chave: id, dados: { valor: v, pixKeyUsada: String(pix_key_usada).trim() } });
    return res.status(200).json({
      success: true,
      message: porLinha ? `${ids.length} comiss${ids.length === 1 ? 'ão marcada' : 'ões marcadas'} como paga${ids.length === 1 ? '' : 's'} e descontada${ids.length === 1 ? '' : 's'} do saldo.` : 'Pagamento registrado e descontado do saldo.',
      saldo_depois: saldoDepois, id, valor: v, ...(porLinha ? { commission_ids: ids } : {}),
    });
  } catch (e) { return res.status(200).json({ success: false, error: String(e?.message || e) }); }
}
