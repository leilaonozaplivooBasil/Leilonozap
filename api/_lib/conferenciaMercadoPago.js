// 🏦 CONFERÊNCIA COM O MERCADO PAGO — a régua única (03/10/2026, DIR-195).
//
// Dono: "preciso ser uma extensão do Mercado Pago com uma comunicação mais
// clara: o dinheiro que entra, sai e fica tem que bater real".
//
// Este arquivo é a ÚNICA tradução do pagamento do Mercado Pago para a nossa
// "situacao". Quem usa: o webhook (a cada aviso), a conciliação (varredura de
// tudo que já passou pelo gateway) e o painel (só lê o que foi gravado).
//
// O caso que abriu isto (Diogo, 02/10): 4 PIX aprovados às 16h–18h, os 4 com
// "cancelamento de liberação de dinheiro" no extrato às 18h21. O webhook recebeu
// os 4 avisos, viu status "approved" e não fez nada — porque nunca olhou o
// campo da LIBERAÇÃO do dinheiro nem o de DEVOLUÇÃO. Agora olha os dois, e
// também contestação (chargeback) e disputa (mediação).
//
// Situações (o que a empresa precisa saber, em uma palavra):
//   liberado          aprovado e o dinheiro está (ou ficará) na conta — tudo certo
//   retido            aprovado, mas o Mercado Pago segurou/retirou a liberação
//   devolvido         devolvido ao pagador por inteiro
//   devolvido_parcial devolvido em parte
//   chargeback        contestado no cartão/PIX e estornado pelo banco
//   disputa           mediação aberta; dinheiro ainda não voltou
//   cancelado         cancelado, recusado ou expirado — nunca entrou
//   pendente          aguardando pagamento ou análise
//   alterado          PIX aprovado e liberado que o gateway MEXEU depois (sem dizer o quê).
//                     Foi exatamente a marca dos 4 PIX do Diogo: date_last_updated às 18h21,
//                     status "approved", liberação "released", devolução zero — e o extrato
//                     mostrando "cancelamento de liberação". Trata-se como dinheiro que saiu
//                     até prova em contrário, e a investigação (abaixo) procura a contestação.
//   desconhecido      o gateway respondeu algo que esta régua não conhece

const MP = 'https://api.mercadopago.com';

export const SITUACOES_DINHEIRO_SAIU = ['retido', 'devolvido', 'devolvido_parcial', 'chargeback', 'disputa', 'alterado'];
// PIX libera na hora: qualquer atualização mais de 10 min depois da aprovação é sinal. Cartão
// NÃO entra (o gateway atualiza o pagamento quando libera o dinheiro em D+N, e isso é normal).
const ALTERACAO_MIN = 10;

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };

/** A situação resumida a partir do objeto de pagamento do Mercado Pago. */
export function situacaoDoPagamento(pay) {
  if (!pay || typeof pay !== 'object') return 'desconhecido';
  const status = String(pay.status || '').toLowerCase();
  const valor = num(pay.transaction_amount);
  const devolvido = num(pay.transaction_amount_refunded);
  const liberacao = String(pay.money_release_status || '').toLowerCase();
  if (status === 'charged_back') return 'chargeback';
  if (status === 'in_mediation') return 'disputa';
  if (status === 'refunded') return 'devolvido';
  if (['cancelled', 'canceled', 'rejected', 'expired'].includes(status)) return 'cancelado';
  if (['pending', 'in_process', 'authorized'].includes(status)) return 'pendente';
  if (status === 'approved') {
    if (devolvido > 0 && valor > 0 && devolvido >= valor) return 'devolvido';
    if (devolvido > 0) return 'devolvido_parcial';
    // 'released' = liberado; 'pending' = ainda vai liberar (cartão em D+N, normal);
    // qualquer outra coisa ('reverted', 'blocked', 'held'…) = o gateway SEGUROU o dinheiro.
    if (!liberacao || liberacao === 'released' || liberacao === 'pending') {
      const ehPix = String(pay.payment_type_id || '').toLowerCase() === 'bank_transfer' || String(pay.payment_method_id || '').toLowerCase() === 'pix';
      const aprovado = Date.parse(pay.date_approved || '');
      const atualizado = Date.parse(pay.date_last_updated || '');
      if (ehPix && Number.isFinite(aprovado) && Number.isFinite(atualizado) && atualizado - aprovado > ALTERACAO_MIN * 60e3) return 'alterado';
      return 'liberado';
    }
    return 'retido';
  }
  return 'desconhecido';
}

/** O resumo que fica em catalog_sales.gateway (sem o bruto inteiro, só o que importa). */
export function resumoDoPagamento(pay, fonte = 'conciliacao') {
  const situacao = situacaoDoPagamento(pay);
  const refunds = Array.isArray(pay?.refunds) ? pay.refunds.map((r) => ({ id: r?.id ?? null, valor: num(r?.amount), status: r?.status ?? null, em: r?.date_created ?? null })) : [];
  return {
    situacao,
    status: pay?.status ?? null,
    status_detail: pay?.status_detail ?? null,
    money_release_status: pay?.money_release_status ?? null,
    money_release_date: pay?.money_release_date ?? null,
    meio: pay?.payment_method_id ?? null,
    tipo: pay?.payment_type_id ?? null,
    valor: num(pay?.transaction_amount),
    liquido: num(pay?.transaction_details?.net_received_amount),
    taxa: num(pay?.fee_details?.reduce?.((s, f) => s + num(f?.amount), 0)),
    devolvido: num(pay?.transaction_amount_refunded),
    refunds,
    chargeback: situacao === 'chargeback',
    disputa: situacao === 'disputa',
    aprovado_em: pay?.date_approved ?? null,
    atualizado_em: pay?.date_last_updated ?? null,
    pagador: pay?.payer?.email ?? null,
    conferido_em: new Date().toISOString(),
    fonte,
  };
}

/**
 * Quando o gateway diz que o dinheiro saiu (ou mexeu no pagamento sem dizer o quê),
 * procura a contestação nos outros recursos do Mercado Pago. Guarda o que cada um
 * respondeu (status HTTP + começo do corpo) para a gente aprender o que o gateway
 * expõe — e, se achar, apura a situação: chargeback > disputa > devolvido.
 * Nunca lança.
 */
export async function investigarPagamento(paymentId, token) {
  const id = encodeURIComponent(String(paymentId));
  const alvos = [
    ['refunds', `${MP}/v1/payments/${id}/refunds`],
    ['chargebacks', `${MP}/v1/chargebacks/search?payment_id=${id}`],
    ['claims', `${MP}/post-purchase/v1/claims/search?resource_id=${id}&resource=payment`],
  ];
  const tentativas = {};
  let chargebacks = 0; let claims = 0; let devolvido = 0;
  for (const [nome, url] of alvos) {
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const texto = await r.text().catch(() => '');
      let j = null; try { j = JSON.parse(texto); } catch { j = null; }
      tentativas[nome] = { http: r.status, corpo: texto.slice(0, 800) };
      if (!r.ok || !j) continue;
      const lista = Array.isArray(j) ? j : (Array.isArray(j.results) ? j.results : (Array.isArray(j.data) ? j.data : []));
      if (nome === 'refunds') devolvido = lista.reduce((s, x) => s + num(x?.amount), 0);
      if (nome === 'chargebacks') chargebacks = lista.length;
      if (nome === 'claims') claims = lista.filter((c) => !['closed', 'cancelled', 'canceled'].includes(String(c?.status || '').toLowerCase())).length;
    } catch (e) {
      tentativas[nome] = { http: 0, erro: String(e?.message || e).slice(0, 200) };
    }
  }
  const situacao = chargebacks > 0 ? 'chargeback' : claims > 0 ? 'disputa' : devolvido > 0 ? 'devolvido' : null;
  return { em: new Date().toISOString(), chargebacks, claims, devolvido: Math.round(devolvido * 100) / 100, situacao, tentativas };
}

/** Busca o pagamento no Mercado Pago. Devolve { ok, pay, http } — nunca lança. */
export async function buscarPagamento(paymentId, token) {
  try {
    const r = await fetch(`${MP}/v1/payments/${encodeURIComponent(String(paymentId))}`, { headers: { Authorization: `Bearer ${token}` } });
    const pay = await r.json().catch(() => null);
    return { ok: r.ok && !!pay?.id, pay, http: r.status };
  } catch (e) {
    return { ok: false, pay: null, http: 0, erro: String(e?.message || e) };
  }
}

/**
 * Resolve o id do PAGAMENTO a partir do aviso do webhook. Aviso de pagamento já
 * traz o id; aviso de chargeback traz o id do chargeback (o pagamento vem dentro);
 * aviso de reclamação (claims) traz o id da reclamação.
 */
export async function resolverPagamentoDoAviso({ topico, recursoId, token }) {
  const t = String(topico || '').toLowerCase();
  if (!recursoId) return { paymentId: null, origem: 'sem_id' };
  if (!t || t === 'payment' || t.startsWith('payment')) return { paymentId: String(recursoId), origem: 'payment' };
  if (t.includes('chargeback')) {
    try {
      const r = await fetch(`${MP}/v1/chargebacks/${encodeURIComponent(String(recursoId))}`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json().catch(() => null);
      const pid = Array.isArray(j?.payments) ? j.payments[0] : (j?.payment_id || null);
      return { paymentId: pid ? String(pid) : null, origem: 'chargeback', detalhe: j ? { id: j.id, amount: j.amount, coverage_applied: j.coverage_applied, documentation_status: j.documentation_status, date_created: j.date_created } : null };
    } catch { return { paymentId: null, origem: 'chargeback' }; }
  }
  if (t.includes('claim')) {
    try {
      const r = await fetch(`${MP}/post-purchase/v1/claims/${encodeURIComponent(String(recursoId))}`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json().catch(() => null);
      const pid = j?.resource_id || j?.payment_id || (Array.isArray(j?.resources) ? j.resources.find((x) => x?.type === 'payment')?.id : null);
      return { paymentId: pid ? String(pid) : null, origem: 'claim', detalhe: j ? { id: j.id, type: j.type, stage: j.stage, status: j.status, reason_id: j.reason_id, date_created: j.date_created } : null };
    } catch { return { paymentId: null, origem: 'claim' }; }
  }
  if (t.includes('merchant_order')) return { paymentId: null, origem: 'merchant_order' };
  // formato antigo manda o id sem dizer o tipo: trata como pagamento
  return { paymentId: String(recursoId), origem: t || 'payment' };
}

/** 'DD/MM HH:MM' em Brasília, para log e aviso. */
export function quandoBR(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d).replace(',', '');
}
