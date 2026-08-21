// reserveBidBalance — reserva saldo de lance (saldo_disponivel → saldo_reservado) de forma ATÔMICA.
// Faltava esse endpoint na Vercel (só existia em base44/functions/) — por isso o lance era
// aceito na tela mas o saldo nunca era descontado de verdade.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

// 📒 LIVRO-CAIXA DA RESERVA (18/08/2026) — gravação INLINE de propósito.
// ⚠️ NÃO trocar por `import ... from '../_lib/reservaLedger.js'`: import relativo de
// 2 níveis dentro de api/functions/ já derrubou o lance em produção (ver cabeçalho de
// api/functions/submitAtomicBid.js). Este arquivo é 100% autocontido e vai continuar.
// Best-effort: falhar aqui NUNCA pode derrubar a reserva já aplicada.
async function ledgerReserva(mov) {
  try {
    await sb('reserva_ledger', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(mov),
    });
  } catch (_) { /* extrato é secundário — o dinheiro já foi movido corretamente */ }
}

// ══════════════════════════════════════════════════════════════════════════════
// 🔐 CRACHÁ DE SESSÃO — CÓPIA INLINE, DE PROPÓSITO (21/08/2026)
// ══════════════════════════════════════════════════════════════════════════════
// A regra oficial mora em api/_lib/sessao.js. Aqui ela é COPIADA em vez de
// importada porque esta rota é autocontida por lei: import de 2 níveis a partir
// de api/functions/ já derrubou o lance em produção (ver o cabeçalho de
// submitAtomicBid.js). São 20 linhas duplicadas contra o risco de derrubar o
// lance de novo — o troco é barato.
//
// ETAPA 1: enquanto SESSAO_MODO não for 'bloquear', NADA é recusado. Só anota
// no log quem chamou sem crachá, pra a gente ver com tráfego real se sobrou
// alguma tela do site que ainda não manda.
import crypto from 'crypto';

function _conferirCracha(req, idDoCorpo, rota) {
  const bloqueia = String(process.env.SESSAO_MODO || '').toLowerCase() === 'bloquear';
  const chave = process.env.SESSAO_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const alvo = String(idDoCorpo || '').trim();
  let motivo = 'ok';
  let bate = false;
  try {
    const h = req?.headers || {};
    const cracha = String((typeof h.get === 'function' ? h.get('x-sessao') : h['x-sessao']) || '').trim();
    const p = cracha.split('.');
    if (!chave) motivo = 'sem_chave_no_servidor';
    else if (!cracha) motivo = 'sem_cracha';
    else if (p.length !== 3 || p[0] !== 'v1') motivo = 'formato';
    else {
      const esperado = Buffer.from(
        crypto.createHmac('sha256', chave).update(`sessao-v1|${p[1]}`).digest('base64')
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), 'utf8');
      const veio = Buffer.from(p[2], 'utf8');
      if (esperado.length !== veio.length || !crypto.timingSafeEqual(esperado, veio)) motivo = 'assinatura';
      else {
        const d = JSON.parse(Buffer.from(p[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
        if (!d?.u) motivo = 'formato';
        else if (!(Number(d.x) > Date.now())) motivo = 'vencido';
        else if (alvo && String(d.u) !== alvo) motivo = 'cracha_de_outra_pessoa';
        else bate = true;
      }
    }
  } catch (e) { motivo = `erro:${e?.message}`; }
  if (bate) return { liberado: true, http: 200 };
  if (!bloqueia) {
    console.warn(`[SESSAO] ${rota}: chamada SEM crachá válido (${motivo}) para o id ${alvo || '?'} — ETAPA 1, nada foi bloqueado.`);
    return { liberado: true, http: 200 };
  }
  console.error(`[SESSAO] ${rota}: RECUSADA (${motivo}) para o id ${alvo || '?'}.`);
  return { liberado: false, http: 401 };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const userId = String(body?.user_id || '').trim();
    const _ses = _conferirCracha(req, userId, 'reserveBidBalance');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    const amount = money(body?.amount);
    // 🔗 PONTO CEGO CORRIGIDO (18/08/2026): a reserva nascia SEM saber de qual leilão
    // era — por isso R$ 13,20 de uma conta ficaram irrastreáveis na auditoria. Agora o
    // leilão vem no corpo e é gravado no livro-caixa. Opcional: se não vier, a reserva
    // continua funcionando exatamente como antes (compatibilidade preservada).
    const auctionId = String(body?.auction_id || '').trim() || null;
    if (!userId || amount <= 0) return res.status(400).json({ success: false, error: 'Dados inválidos' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    for (let attempt = 0; attempt < 3; attempt++) {
      const rows = await (await sb(`app_users?select=saldo_disponivel,saldo_reservado&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
      const user = Array.isArray(rows) ? rows[0] : null;
      if (!user) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });

      const saldoAtual = money(user.saldo_disponivel);
      const reservadoAtual = money(user.saldo_reservado);

      if (saldoAtual < amount) {
        return res.status(200).json({
          success: false, error: 'Saldo insuficiente',
          balance: saldoAtual, required: amount, deficit: money(amount - saldoAtual),
        });
      }

      const novoSaldo = money(saldoAtual - amount);
      const novoReservado = money(reservadoAtual + amount);

      // ══════════════════════════════════════════════════════════════════════
      // 🔴 PONTO 114 (21/08/2026) — `gte.` NÃO É COMPARE-AND-SWAP.
      // ══════════════════════════════════════════════════════════════════════
      // O filtro era `&saldo_disponivel=gte.${amount}`. Isso é um LIMIAR, não
      // uma trava: pergunta "ainda dá pra pagar?", não "ninguém mexeu?".
      //
      // Dois lances simultâneos de R$ 100 numa conta com R$ 100:
      //   • os dois leem saldo 100, reservado 0
      //   • os dois passam no `gte.100`
      //   • os dois gravam saldo_disponivel: 0, saldo_reservado: 100
      // Resultado: DOIS lances de R$ 100 lastreados por R$ 100. E pior — como
      // saldo_reservado é gravado com o valor calculado (não incrementado), a
      // segunda escrita APAGA a reserva da primeira: o dinheiro do primeiro
      // lance some da reserva e o lance fica sem lastro nenhum.
      //
      // Agora trava nas DUAS colunas, com o valor exato que foi lido. Se alguém
      // mexeu no meio, voltam zero linhas e o laço relê — e na segunda leitura o
      // saldo já não cobre, então a segunda reserva é recusada, que é o certo.
      // Mesma correção do releaseBidHold (PONTO 98) e do requestWithdrawal
      // (PONTO 101). Coluna nunca inicializada fica NULL, e "eq.0" nunca casa
      // com NULL — daí o `or(...is.null)` quando o valor lido é 0.
      const fDisp = saldoAtual === 0
        ? 'or(saldo_disponivel.eq.0,saldo_disponivel.is.null)'
        : `saldo_disponivel.eq.${saldoAtual}`;
      const fRes = reservadoAtual === 0
        ? 'or(saldo_reservado.eq.0,saldo_reservado.is.null)'
        : `saldo_reservado.eq.${reservadoAtual}`;
      const patch = await sb(
        `app_users?id=eq.${encodeURIComponent(userId)}&and=(${fDisp},${fRes})`,
        { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ saldo_disponivel: novoSaldo, saldo_reservado: novoReservado }) }
      );
      const updated = await patch.json().catch(() => []);
      const row = Array.isArray(updated) ? updated[0] : null;

      if (row && Math.abs(money(row.saldo_disponivel) - novoSaldo) < 0.01 && Math.abs(money(row.saldo_reservado) - novoReservado) < 0.01) {
        // 📒 extrato: entrada na reserva, com a foto exata do saldo antes/depois
        await ledgerReserva({
          user_id: userId,
          auction_id: auctionId,
          tipo: 'reserva',
          direcao: 'entrada_reserva',
          valor: amount,
          saldo_antes: reservadoAtual,
          saldo_depois: money(row.saldo_reservado),
          origem: 'functions/reserveBidBalance',
        });
        return res.status(200).json({
          success: true,
          balance: row.saldo_disponivel,
          held: row.saldo_reservado,
          new_balance: row.saldo_disponivel,
          new_held_balance: row.saldo_reservado,
        });
      }
      // corrida: alguém mudou o saldo — tenta de novo
    }
    return res.status(200).json({ success: false, error: 'Não foi possível reservar o saldo — tente novamente' });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}