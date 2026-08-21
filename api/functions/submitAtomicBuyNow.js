// submitAtomicBuyNow — "🔥 ARREMATE" (compra imediata) processado no servidor,
// atômico e com estorno automático se qualquer etapa falhar.
//
// 🔴 BUG CORRIGIDO (19/08/2026, autorizado pelo dono) — o fluxo antigo rodava
// inteiro no NAVEGADOR: debitava o saldo por uma função de servidor e DEPOIS
// fazia updates diretos em auctions/auction_messages com a chave anônima —
// exatamente o padrão que já tinha derrubado o lance normal antes (ver cabeçalho
// de submitAtomicBid.js, PONTO 72) e que essas tabelas não têm política de RLS
// pra permitir. Se qualquer passo depois do débito falhasse, o dinheiro já tinha
// saído da carteira e NUNCA voltava — sem estorno, sem leilão ganho, sem produto.
// A mensagem genérica "Erro ao processar arremate" escondia a causa real.
//
// Também corrige o PREÇO cobrado: o front calculava "lance atual + 45%" do nada,
// ignorando totalmente o campo buy_now_price que o admin configura na tela de
// editar leilão ("Compre Já — Arremate Imediato"). Agora o preço cobrado é
// SEMPRE auction.buy_now_price — o mesmo valor que decide se o botão aparece.
//
// Reaproveita finalizeOneAuction (mesma função usada pelo cron de leilões
// vencidos e pelo botão "encerrar" da sala) pra todo o resto do arremate:
// apurar vencedor, pagar comissão (5%, regra oficial), cancelar/liberar o
// Cupom Passaporte proporcional, devolver a reserva do líder anterior. Zero
// lógica duplicada — o arremate imediato vira só "insere um lance mais alto
// que qualquer outro e deixa o motor de encerramento de sempre resolver".
import { fetchAuction, finalizeOneAuction, hasServerEnv } from '../_lib/finalizeAuctionCore.js';

import { exigirSessao } from '../_lib/sessao.js';
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const enc = encodeURIComponent;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

/** Preço válido de arremate imediato, ou null — mesma regra de src/lib/arremateAgora.js. */
function precoArremateAgora(auction) {
  const preco = Number(auction?.buy_now_price);
  if (!Number.isFinite(preco) || preco <= 0) return null;
  const inicial = Number(auction?.starting_price) || 0;
  if (preco <= inicial) return null;
  return money(preco);
}

// ══════════════════════════════════════════════════════════════════════════════
// 🔴 PONTO 122 (21/08/2026) — AS DUAS FUNÇÕES ABAIXO DIZIAM "COM CAS" E NÃO ERAM
// ══════════════════════════════════════════════════════════════════════════════
// O comentário antigo prometia trava otimista, mas o filtro era
// `saldo_disponivel=gte.${amount}` — isso é um PISO ("tem pelo menos tanto"), não
// uma trava ("continua exatamente como eu li"). É o mesmo defeito já corrigido no
// reserveBidBalance.js (PONTO 114).
//
// A conta do estrago, com R$ 100 na carteira e dois cliques no "🔥 ARREMATE"
// chegando juntos (dedo duplo no celular, ou duas abas):
//   • os dois leem saldo_disponivel = 100 e saldo_reservado = 0;
//   • os dois passam pelo `gte.100`;
//   • os dois gravam saldo_disponivel: 0, saldo_reservado: 100.
// Resultado: DOIS arremates reservados, R$ 200 de compromisso, e só R$ 100 saiu
// da carteira. A segunda reserva não tem lastro nenhum — o cliente leva dois
// produtos e a empresa recebe por um.
//
// A trava de verdade é `and=(saldo_disponivel.eq.<lido>,saldo_reservado.eq.<lido>)`:
// se qualquer uma das duas colunas mudou entre a leitura e a escrita, o PATCH não
// pega linha nenhuma e o laço relê. Precisa ser nas DUAS: travar só o disponível
// deixa um depósito simultâneo ser apagado pela escrita da reserva.
// Coluna nunca inicializada fica NULL, e "eq.0" nunca casa com NULL no Postgres —
// por isso o `or(...is.null)` quando o valor lido é zero (PONTO 71).
const filtroIgual = (coluna, valor) => (valor === 0
  ? `or(${coluna}.eq.0,${coluna}.is.null)`
  : `${coluna}.eq.${valor}`);

// 📒 LIVRO-CAIXA DA RESERVA (risco #25 da auditoria): este era um dos caminhos que
// mexia em saldo_reservado sem gravar UMA linha de extrato. Inline de propósito —
// import de 2 níveis dentro de api/functions/ já derrubou o lance em produção.
// Best-effort por contrato: falhar aqui NUNCA derruba o arremate.
async function livroCaixaReserva(mov) {
  try {
    await sb('reserva_ledger', {
      method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(mov),
    });
  } catch (e) { console.warn('[BUYNOW] livro-caixa da reserva:', e?.message); }
}

/** Reserva `amount` de saldo_disponivel → saldo_reservado, com CAS de verdade nas duas colunas. */
async function reservar(userId, amount, auctionId = null) {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const rows = await (await sb(`app_users?select=saldo_disponivel,saldo_reservado&id=eq.${enc(userId)}&limit=1`)).json();
    const user = Array.isArray(rows) ? rows[0] : null;
    if (!user) return { success: false, error: 'usuario_nao_encontrado' };
    const saldoAtual = money(user.saldo_disponivel);
    const reservadoAtual = money(user.saldo_reservado);
    if (saldoAtual < amount) return { success: false, error: 'saldo_insuficiente', balance: saldoAtual };
    const patch = await sb(
      `app_users?id=eq.${enc(userId)}&and=(${filtroIgual('saldo_disponivel', saldoAtual)},${filtroIgual('saldo_reservado', reservadoAtual)})`,
      { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({
        saldo_disponivel: money(saldoAtual - amount),
        saldo_reservado: money(reservadoAtual + amount),
      }) }
    );
    const updated = await patch.json().catch(() => []);
    const row = Array.isArray(updated) ? updated[0] : null;
    if (row) {
      await livroCaixaReserva({
        user_id: String(userId), auction_id: auctionId ? String(auctionId) : null,
        tipo: 'reserva', direcao: 'entrada_reserva', valor: money(amount),
        saldo_antes: reservadoAtual, saldo_depois: money(reservadoAtual + amount),
        origem: 'submitAtomicBuyNow.reservar',
      });
      return { success: true, balance: row.saldo_disponivel };
    }
    // corrida: alguém mexeu no saldo entre a leitura e a escrita — relê e tenta de novo
  }
  return { success: false, error: 'corrida' };
}

/** Devolve `amount` de saldo_reservado → saldo_disponivel, com CAS de verdade. Usado só no estorno de falha. */
async function estornar(userId, amount, auctionId = null) {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const rows = await (await sb(`app_users?select=saldo_disponivel,saldo_reservado&id=eq.${enc(userId)}&limit=1`)).json();
    const user = Array.isArray(rows) ? rows[0] : null;
    if (!user) return false;
    const saldoAtual = money(user.saldo_disponivel);
    const reservadoAtual = money(user.saldo_reservado);
    const devolver = money(Math.min(amount, reservadoAtual));
    if (devolver <= 0) return true;
    const patch = await sb(
      `app_users?id=eq.${enc(userId)}&and=(${filtroIgual('saldo_disponivel', saldoAtual)},${filtroIgual('saldo_reservado', reservadoAtual)})`,
      { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({
        saldo_disponivel: money(saldoAtual + devolver),
        saldo_reservado: money(reservadoAtual - devolver),
      }) }
    );
    const updated = await patch.json().catch(() => []);
    if (Array.isArray(updated) && updated[0]) {
      await livroCaixaReserva({
        user_id: String(userId), auction_id: auctionId ? String(auctionId) : null,
        tipo: 'devolucao_arremate_falhou', direcao: 'saida_reserva', valor: devolver,
        saldo_antes: reservadoAtual, saldo_depois: money(reservadoAtual - devolver),
        origem: 'submitAtomicBuyNow.estornar',
      });
      return true;
    }
  }
  return false;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Método não permitido' });
  try {
    if (!hasServerEnv()) return res.status(500).json({ success: false, message: 'Config do servidor ausente' });

    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const auctionId = String(body?.auction_id || '').trim();
    const userId = String(body?.user_id || '').trim();
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, userId, 'submitAtomicBuyNow');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    if (!auctionId || !userId) return res.status(400).json({ success: false, message: 'Parâmetros inválidos' });

    const userRows = await (await sb(`app_users?select=id,full_name,nickname&id=eq.${enc(userId)}&limit=1`)).json();
    const user = Array.isArray(userRows) ? userRows[0] : null;
    if (!user) return res.status(401).json({ success: false, message: 'Não autorizado' });

    const auction = await fetchAuction(auctionId);
    if (!auction) return res.status(404).json({ success: false, message: 'Leilão não encontrado' });
    if (auction.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Leilão não está ativo', current_state: { status: auction.status } });
    }
    if (Date.now() >= new Date(auction.end_time).getTime()) {
      return res.status(400).json({ success: false, message: 'Leilão já encerrou' });
    }

    const buyNowPrice = precoArremateAgora(auction);
    if (buyNowPrice === null) {
      return res.status(400).json({ success: false, message: 'Arremate imediato não disponível para este leilão' });
    }
    const currentPrice = money(auction.current_price || auction.starting_price);
    if (currentPrice >= buyNowPrice) {
      return res.status(409).json({
        success: false, message: 'O lance atual já alcançou o valor de arremate imediato',
        conflict: true, current_state: { current_price: currentPrice, buy_now_price: buyNowPrice },
      });
    }

    // 💰 Reserva o valor ANTES de tocar em qualquer registro do leilão — se faltar
    // saldo, nada mais roda. A partir daqui, qualquer falha precisa estornar.
    const reserva = await reservar(userId, buyNowPrice, auctionId);
    if (!reserva.success) {
      if (reserva.error === 'saldo_insuficiente') {
        return res.status(200).json({
          success: false, saldo_insuficiente: true,
          message: `Saldo insuficiente para arremate. Necessário: R$ ${buyNowPrice.toFixed(2)}.`,
          required: buyNowPrice, balance: reserva.balance,
        });
      }
      return res.status(409).json({ success: false, message: 'Não foi possível reservar o saldo. Tente novamente.' });
    }

    const winnerName = user.nickname || user.full_name || 'Anônimo';

    // 🎯 Insere o lance de arremate — vira automaticamente o MAIOR lance do leilão
    // (buy_now_price > current_price já garantido acima), então finalizeOneAuction
    // vai apurá-lo como vencedor.
    const bidInsertResp = await sb('auction_messages', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        auction_id: auctionId,
        message_type: 'bid',
        sender_id: userId,
        sender_name: winnerName,
        bid_amount: buyNowPrice,
        created_date: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        frete_amount: 0,
        content: `🔥 ARREMATE RÁPIDO! R$ ${buyNowPrice.toFixed(2).replace('.', ',')}`,
        is_system_message: false,
      }),
    });
    const bidInsertData = await bidInsertResp.json().catch(() => null);
    const bidRow = Array.isArray(bidInsertData) ? bidInsertData[0] : null;
    if (!bidInsertResp.ok || !bidRow) {
      await estornar(userId, buyNowPrice, auctionId);
      return res.status(500).json({ success: false, message: 'Não foi possível registrar o arremate. Tente novamente.' });
    }

    // 🏁 Delega o encerramento pro motor único (mesmo do cron e do botão de
    // encerrar): apura vencedor pelo maior lance, comissão, Cupom Passaporte,
    // devolução do líder anterior. Best-effort de estorno se, por alguma corrida
    // rara, este usuário não sair como vencedor.
    let payload;
    try {
      payload = await finalizeOneAuction(auction);
    } catch (e) {
      await estornar(userId, buyNowPrice, auctionId);
      return res.status(500).json({ success: false, message: 'Erro ao encerrar o leilão: ' + String(e?.message || e) });
    }

    if (payload?.result?.winner_id !== userId) {
      // Perdeu a corrida de encerramento (outro processo fechou primeiro) — devolve o dinheiro.
      await estornar(userId, buyNowPrice, auctionId);
      return res.status(409).json({
        success: false, conflict: true,
        message: 'Outra pessoa arrematou este leilão antes. Seu saldo foi devolvido.',
        current_state: payload?.result || null,
      });
    }

    return res.status(200).json({ success: true, message: 'Arremate confirmado!', ...payload });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Erro ao processar arremate: ' + String(e?.message || e) });
  }
}
