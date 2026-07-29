// productAdminAction — operações de produto (service_role): update | zerarEstoque | delete | setField.
// Guard: ator admin/super_admin OU cargo de estoque (distribuidor/loja_fisica/ponto_retirada).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STOCK = ['distribuidor', 'loja_fisica', 'ponto_retirada'];
const ALLOWED = ['description', 'quantity', 'cost_price', 'selling_price_retail', 'selling_price_wholesale',
  'price_catalog', 'market_value', 'status', 'qty_perfeito', 'qty_bom', 'qty_oficina', 'qty_ruim',
  'sold_amount', 'deposit_name', 'lot', 'notes', 'catalog_active', 'is_featured', 'profit',
  'linked_auctions', 'image_urls', 'source_url', 'date', 'purchase_order'];

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const action = String(body?.action || '');
    const actorId = String(body?.actorId || '').trim();
    const productId = String(body?.productId || '').trim();
    if (!actorId || !productId || !action) return res.status(400).json({ success: false, error: 'actorId, productId e action obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    // guard
    const actorArr = await (await sb(`app_users?select=id,role,career_levels&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    const ok = actor && (['admin', 'super_admin'].includes(actor.role) || (Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK.includes(c))));
    if (!ok) return res.status(403).json({ success: false, error: 'Sem permissão' });

    const now = new Date().toISOString();

    if (action === 'delete') {
      const r = await sb(`products?id=eq.${encodeURIComponent(productId)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      if (!r.ok) { const t = await r.text(); return res.status(200).json({ success: false, error: 'Falha ao excluir', details: t.slice(0, 200) }); }
      return res.status(200).json({ success: true, action: 'delete' });
    }

    let patch = {};
    let prodSnap = null;
    if (action === 'zerarEstoque') {
      // snapshot ANTES de zerar (pro relatório de baixas: título + quantidade baixada)
      try {
        const ps = await (await sb(`products?select=description,quantity&id=eq.${encodeURIComponent(productId)}&limit=1`)).json();
        prodSnap = Array.isArray(ps) ? ps[0] : null;
      } catch (_) { /* segue */ }
      patch = { quantity: 0, qty_perfeito: 0, qty_bom: 0, qty_oficina: 0, qty_ruim: 0, updated_date: now };
    } else if (action === 'update' || action === 'setField') {
      const fields = body?.fields || {};
      for (const k of Object.keys(fields)) { if (ALLOWED.includes(k)) patch[k] = fields[k]; }
      // "Preço Varejo" e "Preço Catálogo" são o MESMO preço de venda em telas diferentes.
      // A Gestão de Estoque só mandava selling_price_retail, então o price_catalog ficava velho
      // e a loja continuava no preço antigo. Agora um espelha o outro.
      const varejo = Number(patch.selling_price_retail);
      const catalogo = Number(patch.price_catalog);
      if (varejo > 0 && !(catalogo > 0)) patch.price_catalog = varejo;
      else if (catalogo > 0 && !(varejo > 0)) patch.selling_price_retail = catalogo;
      patch.updated_date = now;
      if (Object.keys(patch).length <= 1) return res.status(400).json({ success: false, error: 'Nenhum campo válido pra atualizar' });
    } else {
      return res.status(400).json({ success: false, error: 'Ação inválida' });
    }

    const r = await sb(`products?id=eq.${encodeURIComponent(productId)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) });
    if (!r.ok) { const t = await r.text(); return res.status(200).json({ success: false, error: 'Falha ao atualizar', details: t.slice(0, 200) }); }
    // 🔴 zerarEstoque: PostgREST devolve 200/204 MESMO quando 0 linhas casam com o filtro,
    // e um trigger/constraint pode reverter o quantity. Validar a linha retornada antes de
    // confirmar sucesso — senão o frontend mostra "zerado" sem o estoque ter sido zerado.
    if (action === 'zerarEstoque') {
      let rows = [];
      try { rows = await r.json(); } catch (_) { rows = []; }
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return res.status(200).json({ success: false, error: 'Produto não encontrado (0 linhas afetadas)' });
      if (Number(row.quantity) !== 0) return res.status(200).json({ success: false, error: 'Estoque não foi zerado (trigger/constraint bloqueou)', details: `quantity=${row.quantity}` });
    }

    // 🏬 PROPAGA PRA VITRINE. A vitrine lê store_inventory.price (COALESCE com o produto), e esse
    // preço é um snapshot gravado quando o item entrou na loja. Sem reescrever aqui, mudar o
    // "Preço Varejo" na Gestão de Estoque não refletia na loja (ela seguia no valor antigo).
    const novoPreco = Number(patch.selling_price_retail ?? patch.price_catalog);
    if (novoPreco > 0) {
      try {
        await sb(`store_inventory?product_id=eq.${encodeURIComponent(productId)}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ price: Math.round(novoPreco * 100) / 100, updated_at: now }),
        });
      } catch (_) { /* preço do produto já foi salvo; não bloqueia */ }
    }
    // Zerou o estoque → some da vitrine (senão fica produto esgotado à venda)
    if (action === 'zerarEstoque') {
      try {
        await sb(`store_inventory?product_id=eq.${encodeURIComponent(productId)}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ quantity: 0, active: false, updated_at: now }),
        });
      } catch (_) { /* não bloqueia */ }
    }

    // log da baixa (rastreio pra Diana) — agora SEMPRE que zera (operador/motivo opcionais)
    if (action === 'zerarEstoque') {
      try {
        await sb('stock_operations', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
          product_id: productId,
          product_title: prodSnap?.description || null,
          operation_type: 'zerar_estoque',
          quantity_before: Number(prodSnap?.quantity) || 0,
          operator_name: body.operator_name || null,
          reason: body.reason || null,
          operation_date: now,
          actor_id: actorId,
        }) });
      } catch (_) { /* não bloqueia a operação */ }
    }
    return res.status(200).json({ success: true, action });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}