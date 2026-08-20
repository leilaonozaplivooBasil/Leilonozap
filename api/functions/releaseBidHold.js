// releaseBidHold — libera saldo reservado de lance (saldo_reservado → saldo_disponivel) de forma ATÔMICA.
// Faltava esse endpoint na Vercel (só existia em base44/functions/) — irmão de reserveBidBalance.
//
// ⚠️ ARQUIVO 100% AUTOCONTIDO — NÃO ADICIONAR NENHUM `import`.
// Import relativo de 2 níveis dentro de api/functions/ já derrubou o lance em
// produção (ver o cabeçalho de api/functions/submitAtomicBid.js). Tudo o que esta
// rota precisa está escrito aqui dentro, de propósito.
//
// ══════════════════════════════════════════════════════════════════════════════
// 🔴 PONTO 98 (21/08/2026) — GASTAR O MESMO DINHEIRO DUAS VEZES
// ══════════════════════════════════════════════════════════════════════════════
// A auditoria geral encontrou aqui um caminho de fraude que não dependia de sorte
// nenhuma. Nenhuma rota do projeto tem autenticação: a identidade vem do BODY.
// O roteiro era:
//
//   1. deposita R$ 100
//   2. dá um lance de R$ 100  → o dinheiro sai de saldo_disponivel e entra em
//      saldo_reservado, e ele fica liderando o leilão
//   3. chama POST /api/functions/releaseBidHold com o próprio user_id e SEM amount
//      → caía no ramo "senão, libera TUDO" (linha 39 do arquivo antigo)
//   4. os R$ 100 voltam pra saldo_disponivel — e o lance dele CONTINUA de pé
//   5. repete: lidera N leilões com o dinheiro de um só, ou simplesmente saca
//
// A trava de verdade NÃO é exigir amount (isso só fecha a porta da frente: bastava
// mandar amount igual ao valor do lance). A trava é a REGRA DE COMPROMISSO, que já
// existia e é a mesma régua do submitAtomicBid.js:215 ("TRAVA DE DINHEIRO NO
// SERVIDOR"):
//
//   ► O saldo_reservado de uma pessoa NUNCA pode cair abaixo da soma de todos os
//     leilões em que ela está na frente (com o frete de cada um).
//
// Então o teto do que pode ser devolvido é:
//     teto = saldo_reservado − compromisso
// e o compromisso conta os DOIS estados em que o dinheiro ainda está preso:
//     • status = 'active'                  → ele está liderando, o lance está de pé
//     • order_status = 'awaiting_payment'  → o leilão bateu o martelo pra ele e a
//                                            reserva é o que vai pagar o arremate
//                                            (settleAuctionWithBalance.js:58)
//
// Com isso o passo 3 devolve R$ 0: reservado 100 − compromisso 100 = teto 0.
// E o caso legítimo continua funcionando: quando o lance FALHA, ele não vira
// winner_id de nada, o compromisso daquele leilão é zero e o dinheiro volta
// inteiro — que é exatamente pra isso que useBidSubmission.js:96 chama esta rota.
//
// 🔒 FALHA FECHADA: se a consulta do compromisso não responder, NÃO libera nada.
// Devolver saldo sem saber o compromisso é o próprio buraco. O dinheiro não se
// perde — a devolução server-side do fim do leilão ainda roda.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

// 📒 LIVRO-CAIXA DA RESERVA — gravação INLINE de propósito (mesma razão do
// reserveBidBalance.js:15). Esta rota movia saldo_reservado sem deixar UMA linha
// de rastro: era justamente o buraco que a tabela reserva_ledger foi criada pra
// fechar em 18/08/2026. Best-effort: falhar aqui nunca derruba a devolução.
async function ledgerReserva(mov) {
  try {
    await sb('reserva_ledger', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(mov) });
  } catch (_) { /* extrato é secundário — o dinheiro já foi movido corretamente */ }
}

/**
 * Soma tudo o que este usuário ainda PRECISA ter reservado.
 * Mesma régua do submitAtomicBid.js:215 — não inventar outra aqui.
 * Retorna null se a consulta falhar (chamador trata como falha fechada).
 */
async function compromissoDoUsuario(userId) {
  try {
    const r = await sb(
      `auctions?select=id,current_price,frete_reservado_valor&winner_id=eq.${encodeURIComponent(userId)}` +
      `&or=(status.eq.active,order_status.eq.awaiting_payment)`
    );
    if (!r.ok) return null;
    const rows = await r.json();
    if (!Array.isArray(rows)) return null;
    return rows.reduce((s, a) => money(s + money(a.current_price) + money(a.frete_reservado_valor)), 0);
  } catch (_) {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const userId = String(body?.user_id || '').trim();
    const amount = money(body?.amount);
    // 🔗 leilão de origem: usado só pro extrato. A trava de valor NÃO depende dele
    // (o compromisso é somado sobre TODOS os leilões, então mandar o id de outro
    // leilão não afrouxa nada).
    const auctionId = String(body?.auction_id || '').trim() || null;
    if (!userId) return res.status(400).json({ success: false, error: 'user_id é obrigatório' });
    // 🔴 PONTO 98: sem valor NÃO existe mais o ramo "libera tudo". Era ele o
    // caminho da fraude. Os ramos `except_amount` e "sem amount" foram removidos —
    // nenhum chamador vivo usava (só o legado base44/functions/, que não roda aqui).
    if (!(amount > 0)) {
      return res.status(400).json({ success: false, error: 'amount é obrigatório e deve ser maior que zero' });
    }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    for (let attempt = 0; attempt < 3; attempt++) {
      const rows = await (await sb(`app_users?select=saldo_disponivel,saldo_reservado&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
      const user = Array.isArray(rows) ? rows[0] : null;
      if (!user) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });

      const saldoAtual = money(user.saldo_disponivel);
      const reservadoAtual = money(user.saldo_reservado);

      // 🔒 TRAVA DE COMPROMISSO — lida DENTRO do laço, junto com o saldo, pra que a
      // tentativa seguinte de uma corrida use a foto nova dos dois lados.
      const compromisso = await compromissoDoUsuario(userId);
      if (compromisso === null) {
        return res.status(200).json({ success: false, error: 'Não foi possível conferir os lances ativos — tente novamente' });
      }
      const tetoLiberavel = Math.max(0, money(reservadoAtual - compromisso));
      const valorLiberar = money(Math.min(amount, reservadoAtual, tetoLiberavel));

      if (valorLiberar <= 0) {
        return res.status(200).json({
          success: true,
          released: 0,
          released_amount: 0,
          held_balance: reservadoAtual,
          committed: compromisso,
          message: compromisso > 0
            ? 'Nada a liberar: o valor reservado está sustentando lances seus que ainda estão de pé'
            : 'Nenhuma reserva pendente para liberar',
        });
      }

      const novoSaldo = money(saldoAtual + valorLiberar);
      const novoReservado = money(reservadoAtual - valorLiberar);

      // 🔒 CAS DE VERDADE (corrigido no PONTO 98). O filtro antigo era só
      // `saldo_reservado=gte.valorLiberar` — isso NÃO é compare-and-swap: se um
      // depósito caísse entre a leitura e a escrita, este PATCH gravava
      // (saldo_antigo + liberar) e APAGAVA o depósito. Mesma correção que o
      // api/_lib/bidHold.js:59 já tinha e esta rota não recebeu.
      // Coluna nunca inicializada fica NULL, e "eq.0" nunca combina com NULL —
      // por isso o `or(...is.null)` quando o valor lido é 0.
      const dispFilter = saldoAtual === 0 ? 'or(saldo_disponivel.eq.0,saldo_disponivel.is.null)' : `saldo_disponivel.eq.${saldoAtual}`;
      const resFilter = reservadoAtual === 0 ? 'or(saldo_reservado.eq.0,saldo_reservado.is.null)' : `saldo_reservado.eq.${reservadoAtual}`;
      const patch = await sb(
        `app_users?id=eq.${encodeURIComponent(userId)}&and=(${dispFilter},${resFilter})`,
        { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ saldo_disponivel: novoSaldo, saldo_reservado: novoReservado }) }
      );
      const updated = await patch.json().catch(() => []);
      const row = Array.isArray(updated) ? updated[0] : null;

      if (row && Math.abs(money(row.saldo_disponivel) - novoSaldo) < 0.01 && Math.abs(money(row.saldo_reservado) - novoReservado) < 0.01) {
        await ledgerReserva({
          user_id: userId,
          auction_id: auctionId,
          tipo: 'devolucao_cobertura',
          direcao: 'saida_reserva',
          valor: valorLiberar,
          saldo_antes: reservadoAtual,
          saldo_depois: money(row.saldo_reservado),
          origem: 'functions/releaseBidHold',
          observacao: String(body?.description || 'Devolução de reserva de lance não confirmado').slice(0, 300),
        });
        return res.status(200).json({
          success: true,
          released: valorLiberar,
          released_amount: valorLiberar,
          committed: compromisso,
          new_balance: row.saldo_disponivel,
          new_held_balance: row.saldo_reservado,
        });
      }
      // corrida: alguém mudou o saldo — tenta de novo
    }
    return res.status(200).json({ success: false, error: 'Não foi possível liberar a reserva — tente novamente' });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
