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

    const now = new Date().toISOString();

    if (action === 'delete') {
      if (!id) return res.status(400).json({ success: false, error: 'id obrigatório' });

      // 🔴 CORREÇÃO 18/08/2026 — DEVOLVER O DINHEIRO ANTES DE APAGAR O LEILÃO.
      //
      // O QUE ESTAVA ERRADO: apagar um leilão fazia DELETE direto. O saldo que ficou
      // travado no lance do líder (saldo_reservado) continuava travado apontando pra um
      // leilão que não existe mais — dinheiro preso pra sempre, sem rastro pra reconstituir.
      // Medido na auditoria: R$ 109,20 presos em 6 contas por leilões apagados.
      //
      // REGRA AGORA: antes do DELETE, devolve a reserva do líder daquele leilão
      // (saldo_reservado → saldo_disponivel) e registra no livro-caixa.
      //   • Só o LÍDER: quem foi coberto durante o leilão já recebeu na hora.
      //   • Valor = lance dele + frete reservado (mesma base do submitAtomicBid).
      //   • Se o pedido já está PAGO, não devolve: a reserva virou pagamento.
      //   • Nunca devolve mais do que está reservado, e nunca deixa saldo negativo.
      //   • Best-effort: falha aqui NÃO bloqueia a exclusão — mas fica avisado na resposta.
      // ⚠️ Import de 2 níveis já derrubou o lance em produção — por isso inline, sem import.
      let reservaDevolvida = null;
      if (table === 'auctions') {
        try {
          const aRows = await (await sb(`auctions?select=id,winner_id,current_price,frete_reservado_valor,order_status&id=eq.${encodeURIComponent(id)}&limit=1`)).json();
          const auction = Array.isArray(aRows) ? aRows[0] : null;
          const lider = auction?.winner_id ? String(auction.winner_id) : '';
          const jaPago = auction?.order_status === 'paid';
          const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
          const valorPreso = money((Number(auction?.current_price) || 0) + (Number(auction?.frete_reservado_valor) || 0));

          if (lider && !jaPago && valorPreso > 0) {
            for (let tentativa = 0; tentativa < 3; tentativa++) {
              const uRows = await (await sb(`app_users?select=saldo_disponivel,saldo_reservado&id=eq.${encodeURIComponent(lider)}&limit=1`)).json();
              const u = Array.isArray(uRows) ? uRows[0] : null;
              if (!u) break;
              const disponivel = money(u.saldo_disponivel);
              const reservado = money(u.saldo_reservado);
              const liberar = money(Math.min(valorPreso, reservado));
              if (liberar <= 0) break;
              // coluna nunca inicializada fica NULL, e "eq.0" nunca casa com NULL
              const fDisp = disponivel === 0 ? 'or(saldo_disponivel.eq.0,saldo_disponivel.is.null)' : `saldo_disponivel.eq.${disponivel}`;
              const fRes = reservado === 0 ? 'or(saldo_reservado.eq.0,saldo_reservado.is.null)' : `saldo_reservado.eq.${reservado}`;
              const patch = await sb(`app_users?id=eq.${encodeURIComponent(lider)}&and=(${fDisp},${fRes})`, {
                method: 'PATCH', headers: { Prefer: 'return=representation' },
                body: JSON.stringify({ saldo_disponivel: money(disponivel + liberar), saldo_reservado: money(reservado - liberar) }),
              });
              const updated = await patch.json().catch(() => []);
              if (Array.isArray(updated) && updated.length) {
                reservaDevolvida = { user_id: lider, valor: liberar };
                try {
                  await sb('reserva_ledger', {
                    method: 'POST', headers: { Prefer: 'return=minimal' },
                    body: JSON.stringify({
                      user_id: lider,
                      auction_id: id,
                      tipo: 'devolucao_leilao_excluido',
                      direcao: 'saida_reserva',
                      valor: liberar,
                      saldo_antes: reservado,
                      saldo_depois: money(reservado - liberar),
                      origem: 'entityWrite:delete:auctions',
                    }),
                  });
                } catch (e) { console.warn('[DELETE LEILAO] livro-caixa:', e?.message); }
                break;
              }
              // corrida: o saldo mudou entre a leitura e a escrita — tenta de novo
            }
          }
        } catch (e) { console.warn('[DELETE LEILAO] devolucao de reserva:', e?.message); }
      }

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
    return res.status(200).json({ success: true, rows: ur.rows, removidos: ur.removed });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}