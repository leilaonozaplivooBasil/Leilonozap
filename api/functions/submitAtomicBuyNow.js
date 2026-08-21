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
import { cotarFreteDoLeilao } from '../_lib/freteLeilao.js';
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

// 👻 BLOQUEADOR 6 (auditoria OpenAI, 21/08/2026) — LANCE FANTASMA.
// O Buy Now insere a linha em auction_messages ANTES de gravar o frete e de
// encerrar o leilão. Se qualquer um desses dois passos falhar, a gente estorna o
// dinheiro — mas a linha do lance CONTINUA LÁ. E ela é, por construção, o maior
// lance do leilão (é o buy_now_price). Quando o cron `finalizeExpiredAuctions`
// (ou o pg_cron `expire-auctions`) passar depois, ele lê aquela linha e declara
// vencedor uma pessoa cujo dinheiro já foi devolvido: arremate sem lastro.
// Por isso todo caminho de estorno agora apaga o lance também.
// Best-effort na intenção, mas com sinal de volta: se não conseguir apagar, o
// chamador precisa saber pra logar `precisa_intervencao` em vez de dizer que
// está tudo certo.
async function apagarLanceFantasma(bidId) {
  if (!bidId) return true;
  try {
    const r = await sb(`auction_messages?id=eq.${enc(bidId)}`, {
      method: 'DELETE', headers: { Prefer: 'return=minimal' },
    });
    if (!r.ok) {
      console.error('[BUYNOW] LANCE FANTASMA nao apagado, HTTP', r.status, 'bid', bidId);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[BUYNOW] LANCE FANTASMA nao apagado:', e?.message, 'bid', bidId);
    return false;
  }
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
    // ══════════════════════════════════════════════════════════════════════════
    // 🚚 FRETE DO ARREMATE RÁPIDO — corrigido em 21/08/2026
    // ══════════════════════════════════════════════════════════════════════════
    // COMO ESTAVA, e o estrago é financeiro nos DOIS sentidos:
    //     const reserva = await reservar(userId, buyNowPrice, auctionId);   ← só o produto
    //     ... frete_amount: 0
    // e o `auctions.frete_reservado_valor` NÃO era tocado em lugar nenhum.
    //
    //   • leilão SEM líder anterior  → arremate termina com frete ZERO. A empresa
    //     paga a transportadora do próprio bolso. Foi o pedido ARD5856D19.
    //   • leilão COM líder anterior  → o novo vencedor HERDA o frete_reservado_valor
    //     do líder que ele acabou de cobrir. Foi o AR3BEF1939: o R$ 11,60 era de um
    //     lance anterior de R$ 6,80, com OUTRO CEP. O Buy Now nunca calculou nem
    //     reservou aquilo — só ficou lá.
    //
    // Achado da auditoria independente da OpenAI. A minha hipótese anterior
    // ("corrida da cotação assíncrona") estava ERRADA: os dois pedidos foram
    // Arremate Rápido, e o histórico mostra `🔥 ARREMATE RÁPIDO!` com frete_amount = 0.
    //
    // COMO FICOU: o servidor cota o frete pelo `auction.product_id` e pelo CEP do
    // cadastro do vencedor, reserva produto + frete, grava o frete no lance e
    // SOBRESCREVE o frete no lance. Desde o B13, o `frete_reservado_valor` do
    // leilão é gravado pela finalização, dentro do claim do vencedor.
    const cot = await cotarFreteDoLeilao({ auctionId, userId, auction, freteId: body?.frete_id || null });
    if (!cot.ok) {
      // Sem frete não passa. Decisão do dono em 21/08: "não podemos de maneira
      // nenhuma aceitar lances ou arrematar sem frete". Cada motivo vira uma
      // instrução, porque erro seco no meio do leilão faz a pessoa desistir.
      const explica = {
        sem_cep: 'Cadastre seu CEP no perfil para arrematar — o frete precisa ser calculado.',
        produto_nao_vinculado: 'Este leilão está sem produto vinculado, então não dá pra calcular o frete. Avise o suporte.',
        cotacao_indisponivel: 'Não conseguimos calcular o frete para o seu CEP agora. Tente novamente em instantes.',
        opcao_invalida: 'A opção de frete escolhida não está mais disponível. Recarregue a página.',
      }[cot.motivo] || 'Não foi possível calcular o frete deste arremate.';
      return res.status(200).json({ success: false, sem_frete: true, motivo: cot.motivo, message: explica });
    }
    const frete = cot.frete;
    const totalReservar = money(buyNowPrice + frete.valor);

    const reserva = await reservar(userId, totalReservar, auctionId);
    // 🔴 BLOQUEADOR 1 (auditoria OpenAI, 21/08/2026) — ESTA CHECAGEM TINHA SUMIDO.
    // Quando eu troquei a reserva de "só o produto" para "produto + frete", apaguei
    // sem querer o `if (!reserva.success)` e a declaração de `winnerName`. O estrago
    // não é cosmético: sem a checagem, saldo insuficiente seguia em frente e inseria
    // lance sem lastro; e o `winnerName` inexistente estourava ReferenceError DEPOIS
    // da reserva ter dado certo — caindo no catch de fora, que NÃO estorna. Dinheiro
    // preso em saldo_reservado, arremate falhado, nenhuma devolução.
    if (!reserva.success) {
      if (reserva.error === 'saldo_insuficiente') {
        return res.status(200).json({
          success: false, saldo_insuficiente: true,
          message: `Saldo insuficiente. O arremate é R$ ${buyNowPrice.toFixed(2).replace('.', ',')} + R$ ${frete.valor.toFixed(2).replace('.', ',')} de frete = R$ ${totalReservar.toFixed(2).replace('.', ',')}.`,
          necessario: totalReservar, produto: buyNowPrice, frete: frete.valor,
          disponivel: reserva.balance ?? null,
        });
      }
      if (reserva.error === 'usuario_nao_encontrado') {
        return res.status(401).json({ success: false, message: 'Não autorizado' });
      }
      return res.status(409).json({
        success: false, conflict: true,
        message: 'Seu saldo mudou durante o arremate. Tente novamente.',
      });
    }

    const winnerName = user.nickname || user.full_name || 'Anônimo';

    // ══════════════════════════════════════════════════════════════════════════
    // 🔴 BLOQUEADOR 12 (auditoria OpenAI, 21/08/2026) — BARREIRA DE COMPENSAÇÃO
    // ══════════════════════════════════════════════════════════════════════════
    // O dinheiro JÁ SAIU da carteira neste ponto. Antes, cada passo daqui pra
    // frente conferia `resp.ok` e estornava — o que cobre HTTP 400/500, mas NÃO
    // cobre `fetch` LANÇANDO. E `fetch` lança de verdade: DNS, TLS, socket
    // fechado, timeout do runtime. Nesse caso a exceção pulava tudo e caía no
    // catch lá de fora, que não sabe que houve reserva e não estorna.
    // Resultado: dinheiro presoem saldo_reservado, arremate falhado, silêncio.
    //
    // A correção não é mais um `try` por passo. É uma barreira: daqui até o fim,
    // TUDO roda dentro de um bloco que sabe o que já foi feito
    // (`feito.reservado`, `feito.bidId`) e desfaz na ordem inversa. Nenhuma
    // exceção posterior à reserva chega ao catch externo sem passar por aqui.
    const feito = { reservado: true, bidId: null };

    /**
     * Desfaz o que deu certo até agora. Devolve o que NÃO conseguiu desfazer —
     * lista vazia significa "o cliente está exatamente como antes de clicar".
     */
    const desfazer = async () => {
      const pendencias = [];
      if (feito.bidId) {
        const limpou = await apagarLanceFantasma(feito.bidId);
        if (!limpou) pendencias.push(`lance ${feito.bidId} não apagado`);
      }
      if (feito.reservado) {
        const devolveu = await estornar(userId, totalReservar, auctionId);
        if (!devolveu) pendencias.push(`R$ ${totalReservar.toFixed(2)} não estornados do usuário ${userId}`);
        else feito.reservado = false;
      }
      if (pendencias.length) {
        console.error(`[BUYNOW] PRECISA_INTERVENCAO — leilão ${auctionId}: ${pendencias.join(' · ')}`);
      }
      return pendencias;
    };

    /** Encerra em falha SEMPRE desfazendo antes, e nunca escondendo o que sobrou. */
    const falhar = async (http, corpo) => {
      const pendencias = await desfazer();
      return res.status(http).json({
        ...corpo,
        success: false,
        ...(pendencias.length ? {
          precisa_intervencao: true,
          pendencias,
          message: `${corpo.message || 'Não foi possível concluir o arremate.'} ATENÇÃO: parte da operação não pôde ser desfeita automaticamente — o suporte já foi avisado.`,
        } : {}),
      });
    };

    try {
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
          frete_amount: frete.valor,
          content: `🔥 ARREMATE RÁPIDO! R$ ${buyNowPrice.toFixed(2).replace('.', ',')}`,
          is_system_message: false,
        }),
      });
      const bidInsertData = await bidInsertResp.json().catch(() => null);
      const bidRow = Array.isArray(bidInsertData) ? bidInsertData[0] : null;
      if (!bidInsertResp.ok || !bidRow) {
        return await falhar(500, { message: 'Não foi possível registrar o arremate. Tente novamente.' });
      }
      feito.bidId = bidRow.id;

      // ══════════════════════════════════════════════════════════════════════
      // 🚚 BLOQUEADOR 13 — O PATCH SOLTO DE `frete_reservado_valor` SAIU DAQUI
      // ══════════════════════════════════════════════════════════════════════
      // Existia aqui um PATCH direto em `auctions?id=eq.<id>` gravando o frete.
      // Ele não tinha trava de status nem de version, e — pior — quando o
      // arremate falhava depois, o estorno devolvia o dinheiro e apagava o
      // lance, mas o frete FICAVA no leilão, contaminando o vencedor de verdade.
      //
      // Agora o frete é decidido dentro do claim atômico do vencedor, em
      // finalizeAuctionCore.js: quem ganha a corrida do claim grava vencedor E
      // frete na MESMA escrita. O lance já carrega `frete_amount`, que é de onde
      // a apuração tira o valor. Nada a fazer aqui — e é esse "nada" que fecha
      // o buraco: sem escrita solta, não existe escrita para reverter.

      // 🏁 Delega o encerramento pro motor único (mesmo do cron e do botão de
      // encerrar): apura vencedor pelo maior lance, comissão, Cupom Passaporte,
      // devolução do líder anterior.
      const payload = await finalizeOneAuction(auction);

      if (payload?.result?.winner_id !== userId) {
        // Perdeu a corrida de encerramento (outro processo fechou primeiro).
        return await falhar(409, {
          conflict: true,
          message: 'Outra pessoa arrematou este leilão antes. Seu saldo foi devolvido.',
          current_state: payload?.result || null,
        });
      }

      // ✅ Ponto de não-retorno: o arremate é oficialmente deste usuário.
      feito.reservado = false;
      feito.bidId = null;
      return res.status(200).json({ success: true, message: 'Arremate confirmado!', ...payload });
    } catch (e) {
      // 🔴 É AQUI que o B12 é fechado: exceção de rede depois da reserva não
      // escapa mais para o catch externo.
      console.error('[BUYNOW] exceção após a reserva:', e?.message);
      return await falhar(500, { message: 'Erro ao processar o arremate: ' + String(e?.message || e) });
    }
  } catch (e) {
    // Catch EXTERNO: só alcança falhas ANTES da reserva. Depois dela, a
    // barreira de compensação acima trata tudo e nunca deixa passar.
    return res.status(500).json({ success: false, message: 'Erro ao processar arremate: ' + String(e?.message || e) });
  }
}
