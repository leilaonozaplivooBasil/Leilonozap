// finalizeAuctionCore — lógica ÚNICA de arremate no servidor (service role).
// Usada por dois caminhos:
//   • api/functions/finalizeAuction.js — chamado pelo cliente quando o relógio da sala zera
//   • api/functions/finalizeExpiredAuctions.js — cron da Vercel (1x/min) que arremata
//     TODO leilão vencido mesmo sem ninguém na sala
// O claim atômico (WHERE status in active/processing) garante que os dois caminhos
// nunca dupliquem efeitos: só um executa, o outro recebe o consolidado.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
import { cancelarCuponsBloqueados, liberarCupomPassaporte } from './passaporteCoupon.js';
import { recolherBonusPorArremate } from './passaporteBonus.js';
import { oid } from './oid.js';

// tolerância pra deriva de relógio entre cliente e servidor (nunca encerra
// um leilão com mais de 2s restantes)
export const GRACE_MS = 2000;
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400';

export const hasServerEnv = () => Boolean(SUPABASE_URL && SR);

export function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}
export const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const enc = encodeURIComponent;

// ══════════════════════════════════════════════════════════════════════════════
// 🏦 PONTO 100 (21/08/2026) — RASTRO DO DINHEIRO DO LEILÃO
// Decisão do dono (Luiz Alberto Sant'Anna Filho) nesta data.
//
// A REGRA DE PAGAMENTO NÃO MUDA. Continua exatamente o que o documento oficial
// manda: 5% do valor do arremate para UMA pessoa — quem indicou o arrematante.
// Sem cadeia, sem telescópio, sem pool de topo, sem executivo.
//
// O QUE MUDA É A CONTABILIDADE. Antes o leilão movia dinheiro sem deixar
// registro: o martelo somava 5% direto no commission_balance do indicador e não
// gravava UMA linha em commission_records. Duas consequências ruins:
//
//   1. A função recalculateCommissionBalances reescreve o saldo somando as
//      linhas de comissão. Como o leilão não tinha linha, rodar ela APAGAVA o
//      ganho do indicador — dinheiro sumindo sem rastro de onde veio.
//   2. Não existia como abrir um relatório e mostrar quanto o leilão gerou.
//
// Agora o bloco de 30% da rede é registrado inteiro em todo arremate:
//
//   • 5%  → indicador do arrematante (role 'leilao_indicador')
//           Continua sendo o ÚNICO pagamento distribuído. Nada mudou aqui.
//   • 25% → conta oficial da empresa (role 'leilao_retido')
//           Fatia da rede que a empresa optou por NÃO distribuir no leilão.
//           É saldo real e sacável, por decisão expressa do dono: a conta é
//           dele, está no CPF dele, e quando o repasse bancário automático
//           entrar no ar esse valor vira pagamento de verdade.
//   • Sem indicador? Os 30% inteiros vão para 'leilao_retido'. A fatia da rede
//     existe sempre; o que não tem dono fica retido, nunca evapora.
//   • Os outros 70% (margem + tributos) NÃO são comissão e não entram aqui.
//
// Base = finalPrice (só o produto). O FRETE NUNCA COMISSIONA — nem nos 5%,
// nem nos 25%.
//
// ⛔ NÃO RODA EM: plano de investimento (is_investment_plan) e leilão de teste
// (is_test_auction). Leilão de teste não pode gerar dinheiro sacável de verdade.
//
// 📕 Fonte de verdade: docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md, seção 6-A.
// ══════════════════════════════════════════════════════════════════════════════
export const CONTA_OFICIAL_NOME = 'Leilão NoZap - Site Oficial';
export const PCT_REDE_LEILAO = 30.0;      // bloco da rede (igual ao da loja)
export const PCT_INDICADOR_LEILAO = 5.0;  // única fatia distribuída no leilão

// Grava UMA linha em commission_records. Best-effort por contrato: o dinheiro já
// foi movido, e falhar no extrato NUNCA pode derrubar o arremate.
async function gravarLinhaComissaoLeilao(linha) {
  try {
    const id = oid();
    const r = await sb('commission_records', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ id, base44_id: id, sale_type: 'leilao', status: 'confirmed', created_date: new Date().toISOString(), ...linha }),
    });
    return r.ok;
  } catch (e) {
    console.warn('[FINALIZE] extrato de comissão:', e?.message);
    return false;
  }
}

/**
 * Credita a fatia RETIDA (a parte da rede que o leilão não distribui) na conta
 * oficial da empresa, com linha no extrato. Idempotente pelo par
 * (sale_id, role): se já existe linha 'leilao_retido' deste leilão, não repete.
 */
export async function reterFatiaDaRede({ auction, finalPrice, pctRetido, arrematanteId, arrematanteNome }) {
  try {
    if (pctRetido <= 0) return 0;
    const valor = money((finalPrice * pctRetido) / 100);
    if (valor <= 0) return 0;

    const jaTem = await (await sb(
      `commission_records?select=id&sale_id=eq.${enc(auction.id)}&role=eq.leilao_retido&limit=1`
    )).json();
    if (Array.isArray(jaTem) && jaTem.length) return 0;

    const contas = await (await sb(
      `app_users?select=id,full_name,commission_balance&full_name=eq.${enc(CONTA_OFICIAL_NOME)}&limit=1`
    )).json();
    const oficial = Array.isArray(contas) ? contas[0] : null;
    if (!oficial) {
      // 🔴 Sem a conta oficial cadastrada o dinheiro não tem onde cair. NÃO
      // inventa destino: registra alto e claro pra alguém arrumar o cadastro.
      console.error(`[FINALIZE] Conta oficial "${CONTA_OFICIAL_NOME}" não encontrada — R$ ${valor} do leilão ${auction.id} ficaram sem registro.`);
      return 0;
    }

    await gravarLinhaComissaoLeilao({
      sale_id: auction.id,
      user_id: oficial.id,
      user_name: oficial.full_name,
      role: 'leilao_retido',
      percent: pctRetido,
      amount: valor,
      sale_amount: finalPrice,
      product_title: auction.title || null,
      // ⚠️ âncora = o ARREMATANTE. Não usar auction.winner_id aqui: neste ponto
      // ele ainda pode ser o líder ANTERIOR (a foto lida antes do claim atômico).
      anchor_user_id: arrematanteId || null,
      anchor_user_name: arrematanteNome || null,
    });

    // 💰 crédito no saldo — decisão expressa do dono (ver cabeçalho).
    await sb(`app_users?id=eq.${enc(oficial.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ commission_balance: money((Number(oficial.commission_balance) || 0) + valor) }),
    });
    return valor;
  } catch (e) {
    console.warn('[FINALIZE] retenção da fatia da rede:', e?.message);
    return 0;
  }
}

export async function fetchAuction(auctionId) {
  const rows = await (await sb(`auctions?select=*&id=eq.${enc(auctionId)}&limit=1`)).json();
  return Array.isArray(rows) ? rows[0] : null;
}

export function resultPayload(auction, extra = {}) {
  return {
    success: true,
    result: {
      auction_id: auction.id,
      status: auction.status,
      winner_id: auction.winner_id || null,
      winner_name: auction.winner_name || null,
      final_price: money(auction.current_price || auction.starting_price),
      order_status: auction.order_status || null,
      ...extra,
    },
  };
}

// Devolve `valor` de saldo_reservado → saldo_disponivel de UMA conta, com trava
// otimista (só grava se os dois saldos ainda estiverem como foram lidos). Nunca
// devolve mais do que está reservado e nunca lança erro — falha aqui não pode
// impedir o encerramento do leilão. Retorna quanto foi efetivamente devolvido.
async function devolverReserva(userId, valor) {
  const uid = String(userId || '').trim();
  const pedido = money(valor);
  if (!uid || pedido <= 0) return 0;
  try {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const rows = await (await sb(`app_users?select=saldo_disponivel,saldo_reservado&id=eq.${enc(uid)}&limit=1`)).json();
      const u = Array.isArray(rows) ? rows[0] : null;
      if (!u) return 0;
      const disponivel = money(u.saldo_disponivel);
      const reservado = money(u.saldo_reservado);
      const liberar = money(Math.min(pedido, reservado));
      if (liberar <= 0) return 0;
      // coluna nunca inicializada fica NULL, e "eq.0" nunca casa com NULL
      const fDisp = disponivel === 0 ? 'or(saldo_disponivel.eq.0,saldo_disponivel.is.null)' : `saldo_disponivel.eq.${disponivel}`;
      const fRes = reservado === 0 ? 'or(saldo_reservado.eq.0,saldo_reservado.is.null)' : `saldo_reservado.eq.${reservado}`;
      const patch = await sb(`app_users?id=eq.${enc(uid)}&and=(${fDisp},${fRes})`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          saldo_disponivel: money(disponivel + liberar),
          saldo_reservado: money(reservado - liberar),
        }),
      });
      const updated = await patch.json().catch(() => []);
      if (Array.isArray(updated) && updated[0]) return liberar;
      // corrida: o saldo mudou entre a leitura e a escrita — tenta de novo
    }
    return 0;
  } catch (e) {
    console.warn('[FINALIZE] devolverReserva:', e?.message);
    return 0;
  }
}

// Executa o arremate de UM leilão já validado como active/processing e vencido.
// Retorna o payload consolidado (mesmo shape do finalizeAuction original).
export async function finalizeOneAuction(auction) {
  const auctionId = auction.id;

  // 🏆 Apura o vencedor pelo MAIOR lance realmente gravado no banco. Busca TODOS
  // os lances (não só o topo) — o Cupom Passaporte precisa saber, por pessoa, qual
  // foi o MAIOR lance dela neste leilão pra liberar/cancelar só a fatia certa.
  const allBids = await (await sb(
    `auction_messages?select=sender_id,sender_name,bid_amount,created_date&auction_id=eq.${enc(auctionId)}&message_type=eq.bid&order=bid_amount.desc.nullslast,created_date.asc&limit=500`
  )).json();
  const bidsList = Array.isArray(allBids) ? allBids : [];
  const topBid = bidsList[0] || null;

  const winnerId = topBid?.sender_id || null;
  const winnerName = topBid?.sender_name || null;
  const finalPrice = money(topBid?.bid_amount || auction.current_price || auction.starting_price);

  // maior lance de CADA participante neste leilão (bidsList já vem ordenado
  // desc por valor, então o primeiro encontrado de cada sender_id é o maior dele)
  const maiorLancePorParticipante = new Map();
  for (const b of bidsList) {
    if (b?.sender_id && !maiorLancePorParticipante.has(b.sender_id)) {
      maiorLancePorParticipante.set(b.sender_id, money(b.bid_amount));
    }
  }

  // 🔒 Claim atômico: só UM finalizador vence esta corrida.
  const claim = await sb(
    `auctions?id=eq.${enc(auctionId)}&status=in.(active,processing)`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        status: 'ended',
        winner_id: winnerId,
        winner_name: winnerName,
        current_price: finalPrice,
        order_status: winnerId ? 'awaiting_payment' : null,
      }),
    }
  );
  const claimed = await claim.json().catch(() => []);
  if (!Array.isArray(claimed) || claimed.length === 0) {
    // outro chamador encerrou primeiro — devolve o consolidado
    const fresh = await fetchAuction(auctionId);
    return resultPayload(fresh || auction, { already_finalized: true });
  }
  const finalAuction = claimed[0];

  // 👤 Dados completos do vencedor (para a mensagem de vitória)
  let winnerData = null;
  if (winnerId) {
    const users = await (await sb(
      `app_users?select=id,full_name,nickname,email,avatar_url,won_auctions,points,referred_by_id&id=eq.${enc(winnerId)}&limit=1`
    )).json();
    const u = Array.isArray(users) ? users[0] : null;
    winnerData = {
      id: winnerId,
      full_name: u?.full_name || winnerName || 'Vencedor',
      nickname: u?.nickname || winnerName || 'Vencedor',
      email: u?.email || '',
      avatar_url: u?.avatar_url || null,
    };

    // 📈 Stats do vencedor (não-bloqueante)
    if (u) {
      try {
        await sb(`app_users?id=eq.${enc(winnerId)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            won_auctions: (Number(u.won_auctions) || 0) + 1,
            points: (Number(u.points) || 0) + 100,
          }),
        });
      } catch (e) { console.warn('[FINALIZE] stats vencedor:', e?.message); }

      // 🎟️ Arrematou = a FATIA do lance vencedor vira compra → cancela só 10% do
      // valor arrematado (não o bônus inteiro). Cupom já LIBERADO (de uma derrota
      // em outro leilão) permanece intacto.
      try { await cancelarCuponsBloqueados(winnerId, finalPrice); } catch (e) { console.warn('[FINALIZE] cupom passaporte:', e?.message); }

      // 🎟️ Modelo A: o bônus de 10% já está na carteira. Quem ARREMATOU tem o bônus
      // recolhido (o valor pago virou compra). Nunca deixa saldo negativo.
      try { await recolherBonusPorArremate(winnerId, auctionId); } catch (e) { console.warn('[FINALIZE] bônus passaporte:', e?.message); }

      // 💰 COMISSÃO DE LEILÃO — REGRA OFICIAL (04/08/2026, confirmada pelo dono):
      //   • 5% do valor do arremate (era 3%)
      //   • SOMENTE VENDA DIRETA/PESSOAL: uma única pessoa — quem indicou o arrematante.
      //     NÃO tem cadeia, NÃO tem telescópio, NÃO tem pool de topo, NÃO tem executivo.
      //     Todo o restante fica integralmente com a empresa.
      //   • Base = finalPrice = auction.current_price → SÓ O PRODUTO.
      //     O frete viaja separado (frete_reservado_valor) e NUNCA comissiona.
      //   • Paga no MARTELO e está correto: o saldo do arrematante já foi depositado
      //     antecipadamente e reservado no lance, então o martelo JÁ É o pagamento.
      //     NÃO mover este gatilho para o fluxo de pagamento.
      // Saldo de teste ou real conforme is_test_auction. Planos de investimento não comissionam.
      // 📕 Fonte de verdade: docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md
      // 🏦 PONTO 100: pctDistribuido guarda quanto dos 30% da rede saiu de fato.
      // O que sobrar é retido na conta oficial logo abaixo — ver o cabeçalho de
      // reterFatiaDaRede(). O PAGAMENTO em si não mudou: continua 5% pro
      // indicador do arrematante e mais ninguém.
      let pctDistribuido = 0;
      if (u.referred_by_id && !auction.is_investment_plan) {
        try {
          const lic = (await (await sb(
            `app_users?select=id,full_name,network_bids_count,commission_balance,test_valora_balance,valora_pay_balance&id=eq.${enc(u.referred_by_id)}&limit=1`
          )).json())?.[0];
          if (lic) {
            const commission = money(finalPrice * 0.05);
            const patch = {
              network_bids_count: (Number(lic.network_bids_count) || 0) + 1,
              commission_balance: money((Number(lic.commission_balance) || 0) + commission),
            };
            if (auction.is_test_auction === true) {
              patch.test_valora_balance = money((Number(lic.test_valora_balance) || 0) + commission);
            } else {
              patch.valora_pay_balance = money((Number(lic.valora_pay_balance) || 0) + commission);
            }
            await sb(`app_users?id=eq.${enc(lic.id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
            pctDistribuido = PCT_INDICADOR_LEILAO;

            // 📒 PONTO 100: a linha do extrato que faltava. Sem ela o
            // recalculateCommissionBalances APAGAVA este ganho — ele soma
            // commission_records, e o leilão nunca gravava nada.
            // Só no leilão real: leilão de teste não entra no extrato de dinheiro.
            if (auction.is_test_auction !== true) {
              await gravarLinhaComissaoLeilao({
                sale_id: auction.id,
                user_id: lic.id,
                user_name: lic.full_name || null,
                role: 'leilao_indicador',
                percent: PCT_INDICADOR_LEILAO,
                amount: commission,
                sale_amount: finalPrice,
                product_title: auction.title || null,
                anchor_user_id: winnerId,
                anchor_user_name: u.full_name || winnerName || null,
              });
            }
          }
        } catch (e) { console.warn('[FINALIZE] comissão licenciado:', e?.message); }
      }

      // 🏦 PONTO 100: o que dos 30% da rede NÃO foi distribuído fica RETIDO na
      // conta oficial da empresa, com linha no extrato. Sem indicador, retém os
      // 30% inteiros. Plano de investimento e leilão de teste não retêm nada.
      if (!auction.is_investment_plan && auction.is_test_auction !== true) {
        await reterFatiaDaRede({
          auction,
          finalPrice,
          pctRetido: money(PCT_REDE_LEILAO - pctDistribuido),
          arrematanteId: winnerId,
          arrematanteNome: u.full_name || winnerName || null,
        });
      }
    }
  }

  // 🎟️ CUPOM PASSAPORTE — libera a FATIA de quem disputou e NÃO ganhou: só 10% do
  // MAIOR lance que essa pessoa deu NESTE leilão (não o bônus inteiro — ver
  // REGRA CORRIGIDA 19/08/2026 no topo de passaporteCoupon.js). Roda só no
  // ENCERRAMENTO do leilão, nunca no meio, quando a pessoa é só coberta por um
  // lance (ela ainda pode relançar e vencer).
  try {
    for (const [participanteId, maiorLance] of maiorLancePorParticipante) {
      if (participanteId === winnerId) continue;
      try { await liberarCupomPassaporte(participanteId, auctionId, maiorLance); } catch (e) { console.warn('[FINALIZE] libera cupom perdedor:', participanteId, e?.message); }
    }
  } catch (e) { console.warn('[FINALIZE] libera cupons perdedores:', e?.message); }

  // 🔓 DEVOLUÇÃO DE RESERVA NO MARTELO — REGRA OFICIAL CORRIGIDA (08/08/2026).
  //
  // Ser coberto DEVOLVE o dinheiro NA HORA: o submitAtomicBid libera a reserva do
  // líder anterior no mesmo instante em que o lance novo vence. Ou seja: quem foi
  // coberto durante o leilão JÁ RECEBEU e não pode receber de novo aqui.
  //
  // ⚠️ POR QUE ISTO MUDOU: a versão anterior devolvia o maior lance de TODOS os
  // perdedores. Como a devolução só é limitada pelo saldo_reservado TOTAL da conta,
  // ela podia sacar a reserva de OUTRO leilão em que a pessoa está liderando AGORA —
  // soltando dinheiro que devia estar travado e deixando um lance vivo sem lastro.
  //
  // Portanto, aqui devolve-se para UMA única conta: o líder que ainda estava com o
  // dinheiro preso NESTE leilão no momento do encerramento (auction.winner_id lido
  // ANTES do claim), e somente quando ele não for o vencedor final.
  // • Valor = lance dele + frete_reservado_valor deste leilão (mesma base do
  //   submitAtomicBid ao cobrir).
  // • O vencedor final NÃO entra: a reserva dele é consumida como pagamento.
  // • Idempotente: roda depois do claim atômico, que garante um único finalizador.
  const reservasDevolvidas = [];
  try {
    const liderPreso = auction.winner_id || null;
    if (liderPreso && liderPreso !== winnerId) {
      const valorPreso = money(
        (Number(auction.current_price) || 0) + (Number(auction.frete_reservado_valor) || 0)
      );
      const devolvido = await devolverReserva(liderPreso, valorPreso);
      if (devolvido > 0) reservasDevolvidas.push({ user_id: liderPreso, valor: devolvido });
    }
  } catch (e) { console.warn('[FINALIZE] devolução de reservas:', e?.message); }

  // 💬 Mensagem de encerramento no chat — idempotente (só se ainda não existir).
  // Com vencedor: card de vitória. Sem lances: o mesmo card renderiza o modo
  // "encerrado sem lances" no cliente (winner: null).
  let victoryMessageCreated = false;
  try {
    const existing = await (await sb(
      `auction_messages?select=id&auction_id=eq.${enc(auctionId)}&message_type=eq.winner_announcement&limit=1`
    )).json();
    if (!Array.isArray(existing) || existing.length === 0) {
      const imgs = Array.isArray(auction.image_urls) ? auction.image_urls : [];
      const victoryData = {
        winner: winnerData,
        auction: {
          id: auction.id,
          title: auction.title || 'Produto',
          image_urls: [imgs[0] || FALLBACK_IMAGE],
          current_price: finalPrice,
          starting_price: money(auction.starting_price),
        },
      };
      await sb('auction_messages', {
        method: 'POST',
        body: JSON.stringify({
          auction_id: auctionId,
          message_type: 'winner_announcement',
          content: JSON.stringify(victoryData),
          sender_name: 'LanceIA',
          is_system_message: true,
          created_date: new Date().toISOString(),
        }),
      });
      victoryMessageCreated = true;
    }
  } catch (e) { console.warn('[FINALIZE] mensagem de vitória:', e?.message); }

  // 🧾 Log de sistema (best effort)
  try {
    await sb('system_logs', {
      method: 'POST',
      body: JSON.stringify({
        entity_id: auctionId,
        component_name: 'finalizeAuction',
        step: 'AUCTION_FINALIZED',
        status: 'success',
        message: `Encerrado no servidor. Vencedor: ${winnerName || 'sem lances'} — R$ ${finalPrice.toFixed(2)}`,
        created_date: new Date().toISOString(),
      }),
    });
  } catch (_) { /* log é opcional */ }

  return resultPayload(finalAuction, {
    winner: winnerData,
    victory_message_created: victoryMessageCreated,
    reservas_devolvidas: reservasDevolvidas,
  });
}