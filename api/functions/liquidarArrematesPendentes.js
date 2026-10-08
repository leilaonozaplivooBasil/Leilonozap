// liquidarArrematesPendentes — O ARREMATE VIRA PEDIDO SOZINHO, sem depender do
// vencedor voltar ao site.
//
// ══════════════════════════════════════════════════════════════════════════════
// O PROBLEMA (medido em produção, 24/08/2026)
// ══════════════════════════════════════════════════════════════════════════════
// finalizeAuctionCore.js:351 grava `order_status: 'awaiting_payment'` no martelo.
// Quem tira dali e cria o pedido em catalog_sales é settleAuctionWithBalance —
// e ele só era chamado de DOIS lugares, os dois dentro do navegador do vencedor:
//   • WinnerModal.jsx  — se ele estivesse com a sala aberta no exato momento
//   • MyWinnings.jsx   — se ele abrisse "Meus Arremates" depois
//
// Vencedor que fechou a aba e não voltou = arremate que NUNCA vira pedido. Não
// aparece na Gestão de Pedidos, a logística não vê, ninguém envia nada. Para
// sempre.
//
// Retrato de 24/08/2026: 4 produtos reais travados em awaiting_payment, o mais
// antigo parado há 28 dias. Foi o caso relatado — "arrematado e não apareceu nos
// pedidos" (Kit Driver Reator / Rosenberg e Organizador de Mesa / Lucas Arruda,
// os dois parados há 3 dias, com saldo de sobra na carteira).
//
// ══════════════════════════════════════════════════════════════════════════════
// POR QUE LIQUIDAR SOZINHO É CERTO (e não uma decisão inventada aqui)
// ══════════════════════════════════════════════════════════════════════════════
// Não existe escolha de pagamento no arremate. O WinnerModal diz, no próprio
// código: "Liquidação automática: ao abrir como vencedor, o lance é debitado do
// saldo na hora" — sem confirmação, sem opção de PIX. O dinheiro já está travado
// em saldo_reservado desde o lance. Ou seja: o débito automático já é a regra;
// o navegador era só um gatilho acidental. Este cron é o gatilho confiável.
//
// ══════════════════════════════════════════════════════════════════════════════
// COMO — e por que NÃO mexemos em settleAuctionWithBalance
// ══════════════════════════════════════════════════════════════════════════════
// Toda a matemática do dinheiro (débito reserva→disponível, CAS otimista,
// livro-caixa, comissões, criação da venda) fica EXATAMENTE onde está. Este
// arquivo não copia, não move e não reescreve uma linha dela — só chama o mesmo
// endpoint que o navegador chama, com o mesmo corpo.
//
// A única peça nova é o crachá: emitirSessao() assina um crachá válido para o
// vencedor com a chave que só o servidor tem (api/_lib/sessao.js). Assim a
// chamada passa igual à do navegador, e continua funcionando quando o
// SESSAO_MODO=bloquear for ligado (etapa 2).
//
// Corrida com o navegador é impossível por construção: o flip de order_status
// lá dentro é atômico (`&order_status=eq.awaiting_payment` + return=representation).
// Quem chegar depois recebe `already_paid` e não debita nada. Chamar este
// endpoint duas vezes seguidas também não cobra em dobro.
//
// ⚠️ PLANO DE CARREIRA FICA DE FORA. Plano/investimento também nasce
// 'awaiting_payment', mas tem caminho de pagamento próprio (createPartnerPlanPix)
// e NÃO pode ser debitado da carteira. São 44 registros hoje — o filtro abaixo é
// o mesmo que MyWinnings.jsx já usa pra não listá-los.
import { emitirSessao } from '../_lib/sessao.js';
// 📣 DIR-205 (07/10/2026): sem saldo não é silêncio — o vencedor é lembrado por e-mail.
import { enviarAviso } from '../_lib/avisosPorEmail.js';
import { etapaDoLembreteDeArremate } from '../_lib/regrasDosAvisos.js';
// 🏷️ DIR-210 (08/10/2026): passou o prazo sem saldo, o arremate é cancelado por aqui mesmo —
// no mesmo ciclo em que o banco acabou de recusar o pagamento (quem depositou aos 47h59 é
// liquidado, nunca cancelado). Quem cancela é só a função SQL já provada na cadeira.
import { prazoDoArremate, decisaoDoArremateSemSaldo, horasParaCancelar } from '../_lib/regrasDosAvisos.js';
import { avisarAdminUmaVezPorDia } from '../_lib/avisarAdmin.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilaonozap.net';
// Prazo do cancelamento automático: ARREMATE_CANCELA_EM_HORAS ('0'/'off' desliga; vazio = 48).
const HORAS_PARA_CANCELAR = horasParaCancelar(process.env.ARREMATE_CANCELA_EM_HORAS);
const reais = (n) => 'R$ ' + (Number(n) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Por execução. Com os planos já fora da consulta, 100 cobre a fila inteira com
// folga (são 4 produtos reais hoje) — o teto continua existindo só como barreira
// contra um estado ruim virar rajada.
const LOTE = 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

// Plano de carreira / investimento / leilão de teste: nunca liquidar da carteira.
// Espelha o filtro de MyWinnings.jsx — se um dia mudar lá, mude aqui junto.
function ehPlanoOuTeste(a) {
  return a?.is_investment_plan === true
    || a?.is_test_auction === true
    || /\bplano\b/i.test(a?.title || '');
}

// ── DIR-210: as peças do cancelamento (só leitura, salvo a chamada à função SQL) ──

/**
 * O vencedor lidera outro leilão ativo ou tem outro arremate a pagar? Nesse caso o
 * cancelamento NÃO é automático: a devolução da reserva (least(valor, saldo_reservado))
 * poderia soltar a reserva que sustenta o outro compromisso. Mesma régua de releaseBidHold.
 * Se não der para conferir, responde "sim" — melhor avisar o admin do que cancelar no escuro.
 */
async function temOutroLeilaoEmJogo(a) {
  try {
    const r = await sb(`auctions?select=id&winner_id=eq.${encodeURIComponent(a.winner_id)}&id=neq.${encodeURIComponent(a.id)}&or=(status.eq.active,order_status.eq.awaiting_payment)&limit=1`);
    const j = await r.json();
    return !Array.isArray(j) || j.length > 0;
  } catch {
    return true;
  }
}

/** Quem deu o maior lance depois do vencedor (nome e valor), para a reoferta ser decisão humana. */
async function segundoColocado(a) {
  try {
    const r = await sb(`auction_messages?select=sender_id,sender_name,bid_amount&auction_id=eq.${encodeURIComponent(a.id)}&message_type=eq.bid&order=bid_amount.desc.nullslast,created_date.asc&limit=50`);
    const j = await r.json();
    const outro = (Array.isArray(j) ? j : []).find((m) => m?.sender_id && String(m.sender_id) !== String(a.winner_id) && Number(m.bid_amount) > 0);
    return outro ? { nome: outro.sender_name || 'cliente', valor: Number(outro.bid_amount) } : null;
  } catch {
    return null;
  }
}

function textoDoCancelamento(a, c, segundo) {
  return `🔴 *Arremate cancelado sem pagamento*\n\n${a.title} · ${a.winner_name || 'vencedor'} · ${reais(c.valor)} (lance + frete)\n`
    + `${HORAS_PARA_CANCELAR}h depois do encerramento sem saldo na Carteira. Comissões do martelo estornadas: ${reais(c.comissoes_estornadas)}. Reserva devolvida ao vencedor: ${reais(c.reserva_devolvida)}.\n\n`
    + `2º colocado: ${segundo ? `${segundo.nome} · ${reais(segundo.valor)}` : 'não houve'}.\n`
    + `Reofertar é decisão sua: no editor, use Duplicar (reativar este registro re-arremataria o mesmo vencedor pelos lances antigos).\n${BASE_URL}/EditAuction?id=${a.id}`;
}

function textoDoCasoManual(a, horas) {
  return `🟡 *Arremate sem saldo há ${horas}h — cancelar à mão*\n\n${a.title} · ${a.winner_name || 'vencedor'} · ${reais(a.current_price)}\n`
    + 'O vencedor lidera outro leilão ativo ou tem outro arremate a pagar, então o cancelamento automático não roda: a devolução da reserva precisa de olho humano.\n'
    + 'Decidir: cobrar o vencedor, ou pedir o cancelamento (função cancelar_arremate_nao_pago, pelo SQL — ainda não há botão).';
}

export default async function handler(req, res) {
  // 🔐 AUDITORIA 15/09/2026 — cron: com CRON_SECRET configurado na Vercel, só aceita a chamada
  // que a própria Vercel manda (Authorization: Bearer). Sem a variável, segue aberto como era.
  if (process.env.CRON_SECRET && (req.headers?.authorization || '') !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'nao_autorizado' });
  }
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // 🔴 CORREÇÃO 24/08/2026 — O FILTRO TEM QUE VIR ANTES DO LIMITE.
    //
    // A primeira versão pegava os 20 mais antigos e SÓ DEPOIS tirava os planos de
    // carreira, no JavaScript. Só que hoje existem 44 planos e 4 produtos reais em
    // awaiting_payment, e os planos são MUITO mais velhos (o mais antigo é de
    // janeiro). Resultado: os 20 primeiros vinham todos plano, o filtro tirava
    // todos, e sobravam ZERO alvos. O cron rodou 4 vezes sem liquidar nada.
    //
    // Agora as duas colunas de sinalização saem na própria consulta, então o limite
    // conta só produto de verdade. `not.is.true` mantém quem está NULL (a maioria).
    // O filtro por TÍTULO continua no JavaScript de propósito: lá ele usa \bplano\b,
    // que não confunde "Planotec" nem "Mesa Planejada" — o ilike do PostgREST
    // confundiria e deixaria produto legítimo de fora.
    const rows = await (await sb(
      'auctions?select=id,title,winner_id,winner_name,current_price,end_time,is_investment_plan,is_test_auction' +
      '&order_status=eq.awaiting_payment&winner_id=not.is.null&status=in.(ended,sold,processing)' +
      '&is_investment_plan=not.is.true&is_test_auction=not.is.true' +
      `&order=end_time.asc&limit=${LOTE}`
    )).json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(200).json({ success: true, liquidados: 0, resultados: [] });
    }

    const alvos = rows.filter((a) => !ehPlanoOuTeste(a));

    // Tinha pendente e sobrou nada? Isso é exatamente o defeito de cima voltando.
    // Antes esse caso passava MUDO (o log só falava quando liquidava ou dava erro),
    // e foi o que escondeu o problema por 4 execuções seguidas.
    if (alvos.length === 0) {
      console.log(`[CRON LIQUIDAR] ${rows.length} pendente(s), nenhum liquidável — todos plano/teste.`);
      return res.status(200).json({ success: true, liquidados: 0, pendentes: rows.length, resultados: [] });
    }
    const resultados = [];

    for (const a of alvos) {
      try {
        const cracha = emitirSessao(a.winner_id);
        if (!cracha) {
          // Sem chave de assinatura no servidor não dá pra provar quem está chamando.
          // Melhor não liquidar do que liquidar sem identidade.
          resultados.push({ auction_id: a.id, erro: 'sem_chave_de_sessao' });
          continue;
        }

        const r = await fetch(`${BASE_URL}/api/functions/settleAuctionWithBalance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-sessao': cracha },
          body: JSON.stringify({ auction_id: a.id, user_id: a.winner_id }),
        });
        const d = await r.json().catch(() => null);

        // 📣 DIR-205 (07/10/2026) — SEM SALDO NÃO É SILÊNCIO. Medido em produção:
        // um arremate de R$ 246 ficou 26 dias em awaiting_payment, o cron tentou
        // a cada 10 min ("1 sem saldo") e ninguém — nem o vencedor — foi avisado.
        // Agora o vencedor recebe e-mail 1h depois do encerramento e outro 24h
        // depois (1x cada; a trava é a de enviarAviso). O admin vê no vigia.
        // Nada aqui mexe em dinheiro nem no leilão.
        let lembrete = null;
        let cancelamento = null;
        if (d?.insufficient === true) {
          // DIR-210: o prazo entra no e-mail (só quando o cancelamento automático está ligado).
          const cancelaEm = prazoDoArremate(a.end_time, HORAS_PARA_CANCELAR);
          const etapa = etapaDoLembreteDeArremate(a.end_time);
          if (etapa) {
            const saldo = (Number(d.balance) || 0) + (Number(d.reserved) || 0);
            const precisa = Number(d.needed) || Number(a.current_price) || 0;
            const env = await enviarAviso({
              tipo: 'arremate_sem_saldo', userId: a.winner_id, chave: `${a.id}:${etapa}`,
              dados: { produto: a.title, valor: a.current_price, saldo, falta: Math.max(0, Math.round((precisa - saldo) * 100) / 100), segunda: etapa === '24h', cancelaEm },
            }).catch(() => ({ enviado: false, motivo: 'falha' }));
            lembrete = { etapa, enviado: !!env?.enviado, motivo: env?.motivo };
          }

          // 🏷️ DIR-210 — passou o prazo? esperar / adiar / manual / cancelar.
          const decisao = decisaoDoArremateSemSaldo({
            encerrouEm: a.end_time, horas: HORAS_PARA_CANCELAR,
            lembreteSaiuAgora: !!lembrete?.enviado,
            outroLeilaoEmJogo: HORAS_PARA_CANCELAR ? await temOutroLeilaoEmJogo(a) : false,
          });
          cancelamento = { decisao };
          if (decisao === 'manual') {
            const av = await avisarAdminUmaVezPorDia(`arremate_cancelar_manual_${a.id}`, textoDoCasoManual(a, HORAS_PARA_CANCELAR), { sb, horas: 24 }).catch(() => ({ enviado: false }));
            cancelamento.aviso_admin = !!av?.enviado;
          } else if (decisao === 'cancelar') {
            // Só a função SQL mexe em dinheiro e no leilão (comissões → reversed, reserva de volta,
            // order_status 'cancelado'). Ela recusa sozinha plano/teste, já pago/cancelado e
            // quem acabou de ganhar saldo ('tem_saldo_agora' — o próximo tick liquida).
            const rc = await sb('rpc/cancelar_arremate_nao_pago', {
              method: 'POST',
              body: JSON.stringify({ _auction_id: a.id, _motivo: `Sem saldo ${HORAS_PARA_CANCELAR}h depois do encerramento (DIR-210)`, _por: 'liquidarArrematesPendentes' }),
            });
            const c = await rc.json().catch(() => null);
            if (c?.success === true) {
              cancelamento.ok = true;
              cancelamento.reserva_devolvida = c.reserva_devolvida;
              cancelamento.comissoes_estornadas = c.comissoes_estornadas;
              const av = await enviarAviso({
                tipo: 'arremate_cancelado', userId: a.winner_id, chave: a.id,
                dados: { produto: a.title, valor: a.current_price, devolvido: c.reserva_devolvida, horas: HORAS_PARA_CANCELAR },
              }).catch(() => ({ enviado: false, motivo: 'falha' }));
              cancelamento.aviso_vencedor = !!av?.enviado;
              const segundo = await segundoColocado(a);
              cancelamento.segundo_colocado = segundo;
              const adm = await avisarAdminUmaVezPorDia(`arremate_cancelado_${a.id}`, textoDoCancelamento(a, c, segundo), { sb, horas: 24 * 7 }).catch(() => ({ enviado: false }));
              cancelamento.aviso_admin = !!adm?.enviado;
              if (!adm?.enviado) {
                // O cancelamento já está no system_logs (função SQL); aqui fica o rastro de que o admin não foi avisado.
                await sb('system_logs', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ component_name: 'liquidarArrematesPendentes', step: 'AVISO_ADMIN_FALHOU', status: 'warning', message: `Arremate ${a.id} cancelado sem aviso ao admin (${adm?.motivo || 'falha'}).`, payload: { auction_id: a.id, segundo_colocado: segundo }, created_at: new Date().toISOString() }) }).catch(() => {});
              }
              console.log(`[CRON LIQUIDAR] arremate ${a.id} (${a.title}) cancelado após ${HORAS_PARA_CANCELAR}h sem saldo: reserva ${reais(c.reserva_devolvida)} devolvida, comissões ${reais(c.comissoes_estornadas)} estornadas.`);
            } else {
              cancelamento.ok = false;
              cancelamento.erro = c?.error || `http ${rc.status}`;
              if (c?.error !== 'tem_saldo_agora') console.error(`[CRON LIQUIDAR] cancelamento do arremate ${a.id} recusado: ${cancelamento.erro}`);
            }
          }
        }

        resultados.push({
          auction_id: a.id,
          titulo: a.title,
          vencedor: a.winner_name,
          ok: d?.success === true,
          ja_pago: d?.already_paid === true,
          sem_saldo: d?.insufficient === true,
          lembrete,
          cancelamento,
          erro: d?.success === true ? undefined : (d?.error || `http ${r.status}`),
        });
      } catch (e) {
        console.error(`[CRON LIQUIDAR] falha no leilão ${a.id}:`, e?.message);
        resultados.push({ auction_id: a.id, erro: String(e?.message || e) });
      }
    }

    const liquidados = resultados.filter((x) => x.ok && !x.ja_pago).length;
    const semSaldo = resultados.filter((x) => x.sem_saldo).length;
    // Só faz barulho quando algo mudou ou travou — cron silencioso não polui o log.
    if (liquidados || semSaldo || resultados.some((x) => x.erro)) {
      console.log(`[CRON LIQUIDAR] ${liquidados} liquidado(s), ${semSaldo} sem saldo, de ${alvos.length} pendente(s).`);
    }
    return res.status(200).json({ success: true, liquidados, sem_saldo: semSaldo, resultados });
  } catch (e) {
    console.error('[CRON LIQUIDAR] erro fatal:', e);
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
