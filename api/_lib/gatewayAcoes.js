// 🧾 AÇÕES NO GATEWAY — a fila que faz o dinheiro voltar e a pendência fechar, com rastro (03/10/2026, DIR-198).
//
// Dono: "faz o que é o certo… precisamos ter segurança real nisso."
//
// Toda ação sobre uma pendência da conciliação vira uma linha em gateway_acoes
// ANTES de acontecer: quem pediu, por quê, quanto. Quem executa é o servidor
// (o botão do painel executa na hora; o cron da conciliação pega o que ficou
// pendente). O resultado fica na mesma linha. Nada se faz "na mão" sem ficar
// escrito.
//
// Ações:
//   devolver  — devolve ao pagador pelo Mercado Pago (POST /v1/payments/{id}/refunds,
//               com chave de idempotência = id da ação: repetir nunca devolve em dobro).
//               Depois reconfere o pagamento, grava gateway, marca a pendência resolvida.
//   resolver  — só marca a pendência como tratada, com motivo (ex.: compra interna de teste).
//   liberar   — 🛡️ DIR-211 (08/10/2026): depósito em espera do antifraude, liberado pela
//               Beatriz. A decisão 'liberado' já está gravada (resolverPendencia); aqui o
//               PRÓPRIO webhook é chamado por dentro (x-interno) e vira a venda 'paid'.
//               Não marca a pendência como resolvida: o depósito vira uma venda paga comum.
import { buscarPagamento, resumoDoPagamento } from './conferenciaMercadoPago.js';
import { dispararWebhookInterno } from './antifraudeDeposito.js';

const MP = 'https://api.mercadopago.com';
const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const ACOES = ['devolver', 'resolver', 'liberar'];

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

/** Cria a ação (pendente). Devolve a linha. */
export async function pedirAcao({ sale_id, payment_id, acao, valor, motivo, pedida_por }) {
  if (!ACOES.includes(acao)) throw new Error('acao_desconhecida');
  const r = await sb('gateway_acoes', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ sale_id, payment_id: payment_id || null, acao, valor: valor ?? null, motivo: String(motivo || '').slice(0, 500), pedida_por: pedida_por || null }),
  });
  const rows = await r.json().catch(() => null);
  if (!r.ok || !Array.isArray(rows) || !rows[0]) throw new Error('falha_ao_registrar_acao');
  return rows[0];
}

async function marcarResolvida(saleId, por, motivo) {
  await sb(`catalog_sales?id=eq.${encodeURIComponent(saleId)}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ conciliacao_resolvida_em: new Date().toISOString(), conciliacao_resolvida_por: por || null, conciliacao_motivo: String(motivo || '').slice(0, 500) }),
  });
}

async function devolverNoGateway(acao) {
  if (!MP_TOKEN) return { ok: false, erro: 'MP_ACCESS_TOKEN ausente' };
  const paymentId = acao.payment_id;
  if (!paymentId) return { ok: false, erro: 'sem_payment_id' };
  const valor = Number(acao.valor);
  const body = Number.isFinite(valor) && valor > 0 ? JSON.stringify({ amount: Math.round(valor * 100) / 100 }) : '{}';
  const r = await fetch(`${MP}/v1/payments/${encodeURIComponent(String(paymentId))}/refunds`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': String(acao.id) },
    body,
  });
  const texto = await r.text().catch(() => '');
  let j = null; try { j = JSON.parse(texto); } catch { j = null; }
  if (!r.ok) return { ok: false, http: r.status, erro: (j?.message || texto || '').slice(0, 300), bruto: texto.slice(0, 800) };
  // reconfere o pagamento e grava o que o gateway diz agora
  const p = await buscarPagamento(paymentId, MP_TOKEN);
  if (p.ok) {
    const resumo = resumoDoPagamento(p.pay, 'devolucao');
    if (resumo.situacao === 'liberado') resumo.situacao = Number(j?.amount) >= Number(p.pay.transaction_amount) ? 'devolvido' : 'devolvido_parcial'; // devolução recém-criada pode ainda não refletir no pagamento
    resumo.devolucao = { id: j?.id ?? null, valor: Number(j?.amount) || valor, status: j?.status ?? null, em: j?.date_created ?? new Date().toISOString(), acao_id: acao.id };
    await sb(`catalog_sales?id=eq.${encodeURIComponent(acao.sale_id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ gateway: resumo }) });
  }
  return { ok: true, http: r.status, refund_id: j?.id ?? null, valor: Number(j?.amount) || valor, status: j?.status ?? null, bruto: texto.slice(0, 800) };
}

/**
 * 🛡️ DIR-211 — libera um depósito em espera do antifraude re-disparando o PRÓPRIO webhook por
 * dentro (x-interno). A decisão 'liberado' já foi gravada por resolverPendencia; o webhook vê a
 * decisão, vira 'paid' e credita. Só confirma se a resposta diz que creditou.
 */
async function liberarNoAplicativo(acao) {
  if (!acao.payment_id) return { ok: false, erro: 'sem_payment_id' };
  const j = await dispararWebhookInterno(acao.payment_id, 'liberar');
  if (j?.paid || j?.already_paid) return { ok: true, http: j.http, creditado: j.credited ?? null, sale_id: j.sale_id || acao.sale_id };
  if ([401, 403].includes(Number(j?.http))) {
    console.error('[GATEWAY-AÇÕES] o webhook recusou a chamada interna (401/403): confira CRON_SECRET (x-interno) na Vercel — a liberação do antifraude não sai sem isso.');
    return { ok: false, http: j.http, erro: 'config: o webhook recusou a chamada interna (falta CRON_SECRET / x-interno)' };
  }
  return { ok: false, http: j?.http, erro: j?.em_espera ? `ainda_em_espera${j.decisao ? `:${j.decisao}` : ''}${j.retido ? ':retido_no_gateway' : ''}` : String(j?.error || j?.motivo || 'webhook_nao_creditou').slice(0, 200) };
}

/** Executa UMA ação. Grava o resultado na linha. Devolve { ok, resultado }. Nunca lança. */
export async function executarAcao(acao) {
  let resultado;
  try {
    if (acao.acao === 'devolver') resultado = await devolverNoGateway(acao);
    else if (acao.acao === 'resolver') resultado = { ok: true };
    else if (acao.acao === 'liberar') resultado = await liberarNoAplicativo(acao);
    else resultado = { ok: false, erro: 'acao_desconhecida' };
    // DIR-211: 'liberar' NÃO marca a pendência como resolvida — o depósito liberado vira uma venda
    // paga comum, e conciliacao_resolvida_em esconderia dela um 'dinheiro_saiu' futuro no painel.
    if (resultado.ok && acao.acao !== 'liberar') await marcarResolvida(acao.sale_id, acao.pedida_por, `${acao.acao}: ${acao.motivo || ''}`.slice(0, 500));
  } catch (e) {
    resultado = { ok: false, erro: String(e?.message || e).slice(0, 300) };
  }
  await sb(`gateway_acoes?id=eq.${encodeURIComponent(acao.id)}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status: resultado.ok ? 'feita' : (Number(acao.tentativas || 0) + 1 >= 3 ? 'falhou' : 'pendente'), tentativas: Number(acao.tentativas || 0) + 1, resultado, executada_em: resultado.ok ? new Date().toISOString() : null }),
  }).catch(() => {});
  await sb('gateway_eventos', {
    method: 'POST', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ topico: 'acao', acao: acao.acao, recurso_id: String(acao.id), payment_id: acao.payment_id || null, sale_id: acao.sale_id, formato: 'servidor', assinatura: 'n/a', status: resultado.ok ? 'feita' : 'falhou', situacao: null, resultado: resultado.ok ? `acao:${acao.acao}` : `acao_falhou:${acao.acao}`, corpo: { motivo: acao.motivo, pedida_por: acao.pedida_por, valor: acao.valor, resultado: { ...resultado, bruto: undefined } } }),
  }).catch(() => {});
  if (!resultado.ok) console.error(`[GATEWAY-AÇÕES] ${acao.acao} falhou na venda ${acao.sale_id} (ação ${acao.id}): ${resultado.erro || ''}`);
  else console.log(`[GATEWAY-AÇÕES] ${acao.acao} feita na venda ${acao.sale_id} (ação ${acao.id}).`);
  return { ok: !!resultado.ok, resultado };
}

/** Executa as ações pendentes (mais antigas primeiro). Devolve o resumo. */
export async function executarAcoesPendentes({ limite = 20 } = {}) {
  const r = await sb(`gateway_acoes?select=*&status=eq.pendente&order=criada_em.asc&limit=${Math.max(1, Math.min(100, limite))}`);
  const lista = await r.json().catch(() => []);
  if (!Array.isArray(lista) || !lista.length) return { executadas: 0, feitas: 0, falhas: 0 };
  let feitas = 0; let falhas = 0;
  for (const acao of lista) {
    const x = await executarAcao(acao);
    if (x.ok) feitas += 1; else falhas += 1;
  }
  return { executadas: lista.length, feitas, falhas };
}
