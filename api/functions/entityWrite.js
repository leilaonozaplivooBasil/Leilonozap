// entityWrite — escrita genérica de CONTEÚDO (service_role) p/ operadores (admin/super_admin OU cargo
// de estoque). Recebe a TABELA já resolvida + payload já mapeado pelo adapter. Whitelist de tabelas
// de conteúdo (tabelas sensíveis — app_users, wallets, saques, pagamentos — NÃO entram aqui; têm rota própria).
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STOCK = ['distribuidor', 'loja_fisica', 'ponto_retirada'];

const CONTENT_TABLES = new Set([
  'products', 'categories', 'stores', 'sellers', 'auctions', 'auction_messages', 'auction_views',
  'banner_images', 'catalog_settings', 'featured_products', 'footer_settings', 'frete_settings',
  'payment_settings', 'tax_settings', 'pricing_formulas', 'price_history', 'product_operations',
  'batch_registrations', 'lotes_recebidos', 'cash_registers', 'sale_commissions', 'sales',
  'customers', 'deposit_packages', 'financial_expenses', 'system_logs', 'comparai_logs',
  'negotiations', 'luxury_auctions', 'luxury_access_codes', 'bids', 'partner_plan_purchases',
  'catalog_sales',
]);

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

// escreve removendo colunas inexistentes e tentando de novo (robusto a mismatch de campo)
async function writeResilient(method, table, id, payload, depth = 0) {
  const isArr = Array.isArray(payload);
  const path = id ? `${table}?id=eq.${encodeURIComponent(id)}` : table;
  const r = await sb(path, { method, headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
  const rows = await r.json().catch(() => null);
  if (r.ok) return { ok: true, rows: Array.isArray(rows) ? rows : [rows], removed: [] };
  const msg = JSON.stringify(rows || '');
  // PostgREST: "Could not find the 'X' column" ou "column \"X\" of relation ... does not exist"
  const m = msg.match(/'([a-zA-Z0-9_]+)' column/) || msg.match(/column "([a-zA-Z0-9_]+)"/);
  if (m && depth < 12) {
    const bad = m[1];
    const strip = (o) => { const c = { ...o }; delete c[bad]; return c; };
    const np = isArr ? payload.map(strip) : strip(payload);
    const next = await writeResilient(method, table, id, np, depth + 1);
    next.removed = [bad, ...(next.removed || [])];
    return next;
  }
  return { ok: false, details: msg.slice(0, 200) };
}

// 🔴 DEVOLUÇÃO DE RESERVA DE LEILÃO (18/08/2026) — PEÇA ÚNICA.
//
// O QUE ESTAVA ERRADO: existem DOIS caminhos que tiram o leilão de circulação —
// APAGAR e CANCELAR — e NENHUM devolvia o saldo travado no lance do líder. O dinheiro
// ficava reservado apontando pra um leilão que não existe mais ou foi cancelado: o
// cliente vê o valor na conta e não consegue usar. Medido: R$ 109,20 em 6 contas.
//
// Esta função é a ÚNICA fonte da devolução, usada pelos dois caminhos — assim eles
// nunca mais divergem (era exatamente essa divergência que prendia o dinheiro).
//
// REGRA: devolve saldo_reservado → saldo_disponivel do LÍDER daquele leilão.
//   • Só o LÍDER: quem foi coberto durante a disputa já recebeu de volta na hora.
//   • Valor = lance dele + frete reservado (mesma base do submitAtomicBid).
//   • Se o pedido já está PAGO, NÃO devolve: a reserva virou pagamento.
//   • Nunca devolve mais do que está reservado; nunca deixa saldo negativo.
//   • Trava anticorrida (CAS) nas duas colunas: lance/depósito simultâneo recalcula.
//   • Toda movimentação vira linha em reserva_ledger (livro-caixa auditável).
//   • Best-effort: falha aqui NUNCA bloqueia o apagar/cancelar — só avisa na resposta.
// ⚠️ Inline de propósito: import de 2 níveis já derrubou função em produção.
async function devolverReservaDoLeilao(auctionId, motivo) {
  const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
  try {
    const aRows = await (await sb(`auctions?select=id,winner_id,current_price,frete_reservado_valor,order_status&id=eq.${encodeURIComponent(auctionId)}&limit=1`)).json();
    const auction = Array.isArray(aRows) ? aRows[0] : null;
    const lider = auction?.winner_id ? String(auction.winner_id) : '';
    if (!lider || auction?.order_status === 'paid') return null;

    // ══════════════════════════════════════════════════════════════════════════
    // 🔴 PONTO 122 (21/08/2026) — CANCELAR E DEPOIS APAGAR DEVOLVIA DUAS VEZES
    // ══════════════════════════════════════════════════════════════════════════
    // (risco #21 da auditoria) São dois caminhos diferentes chamando esta mesma
    // função, e nada marcava o leilão como "já devolvido". O admin cancela o
    // leilão (devolve) e depois apaga o mesmo leilão da tela — `winner_id` e
    // `current_price` continuam gravados, `order_status` não é 'paid', então a
    // devolução roda de novo.
    //
    // O SEGUNDO PAGAMENTO NÃO SAI DO NADA: `liberar` é limitado pelo
    // saldo_reservado TOTAL da conta, que não sabe de qual leilão é cada pedaço.
    // Se essa pessoa está liderando OUTRO leilão, a segunda devolução solta o
    // dinheiro DAQUELE — o lance dela continua vivo lá, valendo, sem lastro
    // nenhum. Se ela ganhar, não tem saldo pra pagar.
    //
    // A trava é o próprio livro-caixa, por (leilão + pessoa). Fica em (leilão +
    // pessoa) de propósito, não só em leilão: o encerramento normal devolve pro
    // líder ANTERIOR, e apagar depois precisa continuar podendo devolver pro
    // vencedor, que é outra pessoa. E os tipos são só estes dois — a devolução
    // por cobertura pode acontecer várias vezes no mesmo leilão pra mesma pessoa
    // (ela lidera, é coberta, volta a liderar) e não pode entrar nesta conta.
    try {
      const rLedger = await sb(
        `reserva_ledger?select=id&auction_id=eq.${encodeURIComponent(auctionId)}` +
        `&user_id=eq.${encodeURIComponent(lider)}` +
        `&tipo=in.(devolucao_leilao_cancelado,devolucao_leilao_excluido)&limit=1`
      );
      // Falha FECHADA: `sb` não lança em HTTP 4xx/5xx, devolve a resposta. Sem
      // checar `ok` aqui, um erro do banco viraria "não achei nada" e liberaria
      // a segunda devolução — exatamente o que esta trava existe pra impedir.
      if (!rLedger.ok) throw new Error(`livro-caixa respondeu ${rLedger.status}`);
      const jaFeita = await rLedger.json();
      if (Array.isArray(jaFeita) && jaFeita.length) {
        return { user_id: lider, valor: 0, ja_devolvido: true };
      }
    } catch (e) {
      // Não dá pra confirmar se já devolveu. Prefere NÃO devolver: dinheiro preso
      // a mais é resolvido pela faxinaReservasOrfas; dinheiro solto a mais vira
      // lance sem lastro em outro leilão e não tem como voltar atrás.
      console.error('[DEVOLUCAO RESERVA] não deu pra checar duplicidade, abortando por segurança:', e?.message);
      return null;
    }

    const valorPreso = money((Number(auction?.current_price) || 0) + (Number(auction?.frete_reservado_valor) || 0));
    if (valorPreso <= 0) return null;

    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const uRows = await (await sb(`app_users?select=saldo_disponivel,saldo_reservado&id=eq.${encodeURIComponent(lider)}&limit=1`)).json();
      const u = Array.isArray(uRows) ? uRows[0] : null;
      if (!u) return null;

      const disponivel = money(u.saldo_disponivel);
      const reservado = money(u.saldo_reservado);
      const liberar = money(Math.min(valorPreso, reservado));
      if (liberar <= 0) return null;

      // coluna nunca inicializada fica NULL, e "eq.0" nunca casa com NULL
      const fDisp = disponivel === 0 ? 'or(saldo_disponivel.eq.0,saldo_disponivel.is.null)' : `saldo_disponivel.eq.${disponivel}`;
      const fRes = reservado === 0 ? 'or(saldo_reservado.eq.0,saldo_reservado.is.null)' : `saldo_reservado.eq.${reservado}`;
      const patch = await sb(`app_users?id=eq.${encodeURIComponent(lider)}&and=(${fDisp},${fRes})`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ saldo_disponivel: money(disponivel + liberar), saldo_reservado: money(reservado - liberar) }),
      });
      const updated = await patch.json().catch(() => []);
      if (!Array.isArray(updated) || !updated.length) continue; // corrida: relê e tenta de novo

      try {
        const rGrava = await sb('reserva_ledger', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            user_id: lider,
            auction_id: String(auctionId),
            tipo: motivo,
            direcao: 'saida_reserva',
            valor: liberar,
            saldo_antes: reservado,
            saldo_depois: money(reservado - liberar),
            origem: `entityWrite:${motivo}`,
          }),
        });
        // `sb` não lança em erro HTTP — sem esta checagem o catch abaixo nunca
        // rodava e a falha da trava passava despercebida.
        if (!rGrava.ok) throw new Error(`HTTP ${rGrava.status}: ${(await rGrava.text()).slice(0, 160)}`);
      } catch (e) {
        // 🔴 PONTO 122: esta linha deixou de ser só rastro — ela É a trava que
        // impede a segunda devolução. Se não gravar, a trava não existe pro
        // próximo caminho. Erro alto, não aviso baixinho.
        console.error(`[DEVOLUCAO RESERVA] LIVRO-CAIXA NÃO GRAVOU — leilão ${auctionId}, pessoa ${lider}, R$ ${liberar}. A trava anti-devolução-dupla ficou ABERTA neste leilão: ${e?.message}`);
      }

      return { user_id: lider, valor: liberar };
    }
    return null;
  } catch (e) {
    console.warn('[DEVOLUCAO RESERVA] falhou:', e?.message);
    return null;
  }
}

// O nome do campo de cancelamento varia conforme a tela (status / lot_status /
// order_status) e o valor às vezes é "cancelado", às vezes "canceled" — checamos os
// três campos e aceitamos as duas grafias, senão um caminho escaparia sem devolver.
function ehCancelamentoDeLeilao(payload) {
  return [payload?.status, payload?.lot_status, payload?.order_status]
    .some((v) => typeof v === 'string' && /^cancel/i.test(v.trim()));
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const actorId = String(body?.actorId || '').trim();
    const table = String(body?.table || '').trim();
    const action = String(body?.action || '');
    const id = body?.id != null ? String(body.id) : null;
    if (!actorId || !CONTENT_TABLES.has(table) || !['create', 'update', 'delete', 'bulkCreate'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Parâmetros inválidos ou tabela não permitida' });
    }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const actorArr = await (await sb(`app_users?select=id,role,career_levels&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    const ok = actor && (['admin', 'super_admin'].includes(actor.role) || (Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK.includes(c))));
    if (!ok) return res.status(403).json({ success: false, error: 'Sem permissão' });

    // ══════════════════════════════════════════════════════════════════════════
    // 🔴 PONTO 115 (21/08/2026) — VENDA NÃO É "CONTEÚDO" (riscos #19 e #20)
    // ══════════════════════════════════════════════════════════════════════════
    // `catalog_sales` estava na lista de tabelas de conteúdo desta rota genérica,
    // que aceita não só admin como QUALQUER conta com cargo de estoque
    // (distribuidor, loja física, ponto de retirada — a constante STOCK acima).
    //
    // Com isso um distribuidor podia:
    //   • APAGAR a linha de uma venda paga — inclusive de outra pessoa —
    //     deixando as comissões órfãs, o dinheiro já creditado, e destruindo o
    //     rastro da venda. Sem log nenhum do que foi apagado.
    //   • Devolver o status de uma venda paga para 'pending_payment'. Parece
    //     inofensivo, mas rearma a ÚNICA trava anti-pagamento-duplo da adesão e
    //     dos depósitos (risco #19): basta o webhook rodar de novo — ele é
    //     público e o polling também o dispara — e o Mercado Pago confirma que
    //     o pagamento continua aprovado. O sistema paga TUDO outra vez.
    //
    // A venda já tem rotas próprias pra cada operação legítima:
    // createStoreOrder, updateOrderStatus, excluirMeuPedido, cancelPdvPix — todas
    // com regra de negócio e estorno. Esta rota genérica não precisa tocar nela.
    //
    // A trava é em três camadas, porque cada uma pega um caminho diferente:
    const VENDA_TEM_ROTA_PROPRIA = table === 'catalog_sales';
    if (VENDA_TEM_ROTA_PROPRIA) {
      const isAdmin = actor && ['admin', 'super_admin'].includes(actor.role);
      // 1) apagar venda: NUNCA por aqui, nem admin. Apagar venda paga destrói
      //    rastro de dinheiro — quem precisa cancelar usa updateOrderStatus,
      //    que estorna comissão e devolve ao comprador.
      if (action === 'delete') {
        return res.status(403).json({
          success: false,
          error: 'Venda não pode ser apagada por aqui. Use o cancelamento no gerenciador de pedidos — ele estorna a comissão e devolve o dinheiro ao comprador.',
        });
      }
      // 2) cargo de estoque não mexe em venda, só admin.
      if (!isAdmin) {
        return res.status(403).json({ success: false, error: 'Sem permissão para alterar vendas.' });
      }
      // 3) nem admin reabre venda paga por aqui — é isso que rearma a trava
      //    anti-pagamento-duplo. Trocar status de venda é rota própria, com log.
      const proibidas = ['status', 'total_amount', 'sale_price', 'commission_total', 'mp_payment_id', 'buyer_id', 'seller_id'];
      const alvo = Array.isArray(body?.payload) ? (body.payload[0] || {}) : (body?.payload || {});
      const tocadas = proibidas.filter((c) => Object.prototype.hasOwnProperty.call(alvo, c));
      if (tocadas.length) {
        return res.status(403).json({
          success: false,
          error: `Estes campos da venda não podem ser alterados por aqui: ${tocadas.join(', ')}. Use o gerenciador de pedidos.`,
        });
      }
    }

    const now = new Date().toISOString();

    if (action === 'delete') {
      if (!id) return res.status(400).json({ success: false, error: 'id obrigatório' });

      // 🔴 Antes de apagar o leilão, devolve o saldo travado no lance do líder.
      // Sem isso o dinheiro ficava reservado apontando pra um leilão inexistente.
      const reservaDevolvida = table === 'auctions'
        ? await devolverReservaDoLeilao(id, 'devolucao_leilao_excluido')
        : null;

      const r = await sb(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      if (!r.ok) { const t = await r.text(); return res.status(200).json({ success: false, error: t.slice(0, 200), reserva_devolvida: reservaDevolvida }); }
      return res.status(200).json({ success: true, reserva_devolvida: reservaDevolvida });
    }

    if (action === 'create' || action === 'bulkCreate') {
      const stamp = (p) => ({ id: p.id || oid(), base44_id: p.base44_id || p.id || undefined, created_date: p.created_date || now, updated_date: now, ...p });
      const payload = action === 'bulkCreate'
        ? (Array.isArray(body?.payload) ? body.payload.map(stamp) : [])
        : stamp(body?.payload || {});
      const norm = (x) => { if (x.base44_id === undefined) x.base44_id = x.id; return x; };
      const finalPayload = Array.isArray(payload) ? payload.map(norm) : norm(payload);
      const cr = await writeResilient('POST', table, null, finalPayload);
      if (!cr.ok) return res.status(200).json({ success: false, error: 'Falha ao criar', details: cr.details });
      return res.status(200).json({ success: true, rows: cr.rows, removidos: cr.removed });
    }

    // update
    if (!id) return res.status(400).json({ success: false, error: 'id obrigatório' });
    const patch = { ...(body?.payload || {}), updated_date: now };
    const ur = await writeResilient('PATCH', table, id, patch);
    if (!ur.ok) return res.status(200).json({ success: false, error: 'Falha ao atualizar', details: ur.details });

    // 🔴 CANCELAR leilão devolve o dinheiro igual a APAGAR (18/08/2026).
    // Era o irmão esquecido do bug: o admin cancelava pela tela e o saldo do líder
    // continuava travado num leilão que ninguém mais podia disputar nem pagar.
    // Roda DEPOIS do cancelamento dar certo — nunca devolve dinheiro de leilão que
    // seguiu ativo. Best-effort: não desfaz o cancelamento se a devolução falhar.
    const reservaDevolvidaCancel = (table === 'auctions' && ehCancelamentoDeLeilao(body?.payload))
      ? await devolverReservaDoLeilao(id, 'devolucao_leilao_cancelado')
      : null;

    return res.status(200).json({ success: true, rows: ur.rows, removidos: ur.removed, reserva_devolvida: reservaDevolvidaCancel });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}