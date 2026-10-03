// 🏦 conciliarMercadoPago — A AUDITORIA: pagamento por pagamento, o que o
// Mercado Pago diz contra o que o nosso banco diz (03/10/2026, DIR-195).
//
// Dono: "preciso saber todo o dinheiro que está entrando, saindo e ficando;
// esses números precisam bater real. Preciso ser uma extensão do Mercado Pago
// com uma comunicação mais clara."
//
// O que faz: pega as vendas que passaram pelo gateway (mp_payment_id), consulta
// cada pagamento na API do Mercado Pago com a credencial do servidor, grava o
// resumo em catalog_sales.gateway (régua única em api/_lib/conferenciaMercadoPago.js)
// e, quando o gateway diz que o dinheiro de um DEPÓSITO saiu (retido, devolvido,
// contestado, em disputa) e o depósito segue "pago" aqui, TRAVA o saldo daquele
// depósito na carteira (bloquear_saldo_contestado) — para ninguém gastar dinheiro
// que a empresa já não tem. Tudo com rastro: wallet_ledger + gateway_eventos.
//
// Quem chama:
//   • o Painel do Investidor ("Conferir agora"): admin, em lotes, até acabar;
//   • o cron da Vercel (a cada 30 min): rede de segurança caso um aviso do
//     webhook se perca — confere primeiro o que nunca foi conferido e depois o
//     mais antigo, sempre priorizando os últimos 45 dias.
//
// O que NUNCA faz: mudar status de venda, creditar carteira, devolver dinheiro.
// Isso continua sendo decisão humana (ou do webhook, no fluxo normal de pagamento).
import { exigirSessao } from '../_lib/sessao.js';
import { buscarPagamento, resumoDoPagamento, investigarPagamento, SITUACOES_DINHEIRO_SAIU } from '../_lib/conferenciaMercadoPago.js';
import { executarAcoesPendentes } from '../_lib/gatewayAcoes.js';

const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const PAGOS = ['paid', 'pago', 'entregue', 'shipped', 'delivered', 'preparando', 'saiu_entrega', 'confirmado', 'concluido'];
// A function tem maxDuration 60 s (vercel.json). Para em 50 s, devolve "restantes" e a tela (ou o próximo cron) continua.
const ORCAMENTO_MS = 50000;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

/** Confere UMA venda no gateway e grava. Devolve o que mudou. */
export async function conferirVenda(sale, { fonte = 'conciliacao', origem = 'conciliacao' } = {}) {
  const r = await buscarPagamento(sale.mp_payment_id, MP_TOKEN);
  if (!r.ok) {
    // 404 = o id guardado não é um pagamento do MP (ou é de outra conta). Fica registrado como desconhecido.
    const resumo = { situacao: 'desconhecido', http: r.http, erro: r.erro || null, conferido_em: new Date().toISOString(), fonte };
    if (r.http === 404) await sb(`catalog_sales?id=eq.${encodeURIComponent(sale.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ gateway: resumo }) });
    return { sale_id: sale.id, payment_id: sale.mp_payment_id, situacao: 'desconhecido', http: r.http, consultado: r.http === 404 };
  }
  const resumo = resumoDoPagamento(r.pay, fonte);
  // 🔎 dinheiro saiu ou o gateway mexeu sem dizer o quê: procura a contestação nos outros recursos
  if (SITUACOES_DINHEIRO_SAIU.includes(resumo.situacao)) {
    resumo.investigacao = await investigarPagamento(sale.mp_payment_id, MP_TOKEN);
    if (resumo.investigacao?.situacao) { resumo.situacao_bruta = resumo.situacao; resumo.situacao = resumo.investigacao.situacao; }
  }
  const anterior = sale.gateway?.situacao || null;
  const pagoAqui = PAGOS.includes(String(sale.status));
  const saiu = SITUACOES_DINHEIRO_SAIU.includes(resumo.situacao);
  let bloqueio = null;
  if (saiu && pagoAqui && sale.kind === 'wallet_deposit') {
    const rb = await sb('rpc/bloquear_saldo_contestado', {
      method: 'POST',
      body: JSON.stringify({ _sale_id: sale.id, _motivo: `Mercado Pago: ${resumo.situacao} (pagamento ${sale.mp_payment_id}); saldo bloqueado até a resolução`, _origem: origem }),
    });
    bloqueio = await rb.json().catch(() => null);
    if (bloqueio?.success && !bloqueio.ja_bloqueado) {
      console.error(`[CONCILIAÇÃO] DINHEIRO SAIU — ${resumo.situacao} no pagamento ${sale.mp_payment_id} (venda ${sale.id}, ${sale.buyer_name}, R$ ${resumo.valor}). Bloqueado R$ ${bloqueio.bloqueado} na carteira; não recuperado R$ ${bloqueio.nao_recuperado}.`);
    }
    resumo.bloqueio = bloqueio ? { success: !!bloqueio.success, bloqueado: bloqueio.bloqueado ?? 0, nao_recuperado: bloqueio.nao_recuperado ?? 0, ja_bloqueado: !!bloqueio.ja_bloqueado, error: bloqueio.error || null, em: new Date().toISOString() } : null;
  } else if (sale.gateway?.bloqueio) {
    resumo.bloqueio = sale.gateway.bloqueio; // mantém o rastro do bloqueio anterior
  }
  await sb(`catalog_sales?id=eq.${encodeURIComponent(sale.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ gateway: resumo }) });
  const divergente = (saiu && pagoAqui) || (resumo.situacao === 'liberado' && ['cancelado', 'canceled', 'cancelled'].includes(String(sale.status))) || (pagoAqui && ['cancelado', 'pendente'].includes(resumo.situacao));
  if (divergente && anterior !== resumo.situacao) {
    await sb('gateway_eventos', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ topico: 'conciliacao', acao: fonte, recurso_id: String(sale.mp_payment_id), payment_id: String(sale.mp_payment_id), sale_id: sale.id, formato: 'servidor', assinatura: 'n/a', status: resumo.status, situacao: resumo.situacao, resultado: bloqueio?.success && !bloqueio.ja_bloqueado ? 'bloqueado' : 'divergencia', corpo: { nosso_status: sale.status, kind: sale.kind, valor: resumo.valor, bloqueio: resumo.bloqueio || null } }),
    }).catch(() => {});
  }
  return { sale_id: sale.id, payment_id: sale.mp_payment_id, nome: sale.buyer_name, kind: sale.kind, status: sale.status, valor: resumo.valor, situacao: resumo.situacao, anterior, divergente, bloqueio: resumo.bloqueio || null };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  const inicio = Date.now();
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });
    if (!MP_TOKEN) return res.status(500).json({ success: false, error: 'MP_ACCESS_TOKEN ausente no servidor' });

    // 🔐 Dois caminhos de entrada: o cron da Vercel (Bearer CRON_SECRET) ou um admin com crachá.
    const ehCron = !!process.env.CRON_SECRET && (req.headers?.authorization || '') === `Bearer ${process.env.CRON_SECRET}`;
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body && typeof body === 'object' ? body : {};
    if (!ehCron) {
      if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
      const userId = String(body?.user_id || '').trim();
      const _ses = exigirSessao(req, userId, 'conciliarMercadoPago');
      if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
      const ator = (await (await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(userId)}&limit=1`)).json())[0];
      if (!ator || !['admin', 'super_admin'].includes(ator.role)) return res.status(403).json({ success: false, error: 'Acesso restrito a administradores' });
    }

    // 🧾 DIR-198 — a fila de ações (devolver pelo gateway / marcar resolvida) roda primeiro no cron:
    // o que o painel ou a auditoria pediu e ainda não aconteceu, acontece aqui, com rastro.
    const acoes = ehCron ? await executarAcoesPendentes({ limite: 20 }) : null;
    const lote = Math.max(1, Math.min(200, parseInt(body?.lote, 10) || (ehCron ? 150 : 25)));
    const tudo = body?.tudo === true; // admin: reconferir tudo, mesmo o já conferido hoje
    const sales_ids = Array.isArray(body?.sale_ids) ? body.sale_ids.map(String).slice(0, 60) : null;

    // Ordem: nunca conferido primeiro, depois o conferido há mais tempo. O cron só olha 45 dias.
    let q;
    if (sales_ids?.length) {
      q = `catalog_sales?select=id,mp_payment_id,status,kind,buyer_id,buyer_name,total_amount,sale_price,created_at,gateway&id=in.(${sales_ids.map(encodeURIComponent).join(',')})`;
    } else {
      const filtros = ['mp_payment_id=not.is.null'];
      if (ehCron) filtros.push(`created_at=gte.${new Date(Date.now() - 45 * 864e5).toISOString()}`);
      if (!tudo && !ehCron) filtros.push(`or=(gateway.is.null,gateway->>conferido_em.lt.${new Date(Date.now() - 20 * 60e3).toISOString()})`);
      q = `catalog_sales?select=id,mp_payment_id,status,kind,buyer_id,buyer_name,total_amount,sale_price,created_at,gateway&${filtros.join('&')}&order=gateway->>conferido_em.asc.nullsfirst,created_at.desc&limit=${lote}`;
    }
    const vendas = await (await sb(q)).json();
    if (!Array.isArray(vendas)) return res.status(200).json({ success: false, error: 'Falha ao ler vendas', detail: JSON.stringify(vendas).slice(0, 200) });

    const resultados = [];
    let conferidos = 0;
    for (const sale of vendas) {
      if (Date.now() - inicio > ORCAMENTO_MS) break;
      const r = await conferirVenda(sale, { fonte: ehCron ? 'cron' : 'conciliacao', origem: ehCron ? 'cron_conciliacao' : 'conciliacao_admin' });
      conferidos += 1;
      if (r.divergente || r.bloqueio?.bloqueado > 0) resultados.push(r);
    }

    // quantas ainda faltam (nunca conferidas ou conferidas há mais de 20 min)
    let restantes = 0;
    if (!sales_ids?.length) {
      const cab = await sb(`catalog_sales?select=id&mp_payment_id=not.is.null${tudo ? '' : `&or=(gateway.is.null,gateway->>conferido_em.lt.${new Date(Date.now() - 20 * 60e3).toISOString()})`}&limit=1`, { headers: { Prefer: 'count=exact', Range: '0-0' } });
      const cr = cab.headers.get('content-range') || '';
      restantes = parseInt(cr.split('/')[1], 10) || 0;
    }
    if (ehCron) console.log(`[CONCILIAÇÃO] cron: ${conferidos} conferidos, ${resultados.length} com divergência, ${restantes} restantes; ações: ${JSON.stringify(acoes)}.`);
    return res.status(200).json({ success: true, conferidos, restantes, divergencias: resultados, acoes, duracao_ms: Date.now() - inicio });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e).slice(0, 200) });
  }
}
