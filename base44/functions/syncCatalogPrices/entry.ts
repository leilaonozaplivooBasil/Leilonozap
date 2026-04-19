import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * 🔄 Sincroniza price_catalog (Loja Virtual) com selling_price_retail (Preço dinâmico)
 *
 * Admin-only. Usado no painel PrecificaVivo para:
 *  - detectar produtos cuja vitrine está fora de sincronia com o preço dinâmico
 *  - aplicar a sincronização de forma controlada (preview → apply)
 *
 * Modos:
 *  - action: "count"   → { out_of_sync: <n> }
 *  - action: "preview" → { products: [{ id, description, price_catalog, selling_price_retail, diff }] }
 *  - action: "apply"   → aplica price_catalog = selling_price_retail nos produtos recebidos
 *
 * Critério de "fora de sincronia":
 *   catalog_active === true
 *   AND selling_price_retail > 0
 *   AND price_catalog > 0
 *   AND |price_catalog - selling_price_retail| >= 0.01
 *
 * NOTA: não toca em produtos com price_catalog = 0/null (nunca foi precificado no catálogo)
 *       para evitar criar preço onde não existia intencionalmente.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, product_ids } = body;

    // ───────────────────────────────────────────────
    // Helper: lista produtos dessincronizados
    // ───────────────────────────────────────────────
    const getOutOfSyncProducts = async () => {
      // Busca apenas produtos ativos no catálogo (limite generoso)
      const products = await base44.asServiceRole.entities.Product.filter(
        { catalog_active: true },
        '-updated_date',
        1000
      );

      return (products || []).filter(p => {
        const retail = p.selling_price_retail || 0;
        const catalog = p.price_catalog || 0;
        if (retail <= 0 || catalog <= 0) return false;
        return Math.abs(catalog - retail) >= 0.01;
      });
    };

    // ───────────────────────────────────────────────
    // ACTION: count
    // ───────────────────────────────────────────────
    if (action === 'count') {
      const outOfSync = await getOutOfSyncProducts();
      return Response.json({
        success: true,
        out_of_sync: outOfSync.length
      });
    }

    // ───────────────────────────────────────────────
    // ACTION: preview
    // ───────────────────────────────────────────────
    if (action === 'preview') {
      const outOfSync = await getOutOfSyncProducts();
      const products = outOfSync.map(p => ({
        id: p.id,
        description: p.description,
        price_catalog: p.price_catalog,
        selling_price_retail: p.selling_price_retail,
        diff: parseFloat((p.selling_price_retail - p.price_catalog).toFixed(2))
      }));
      return Response.json({
        success: true,
        count: products.length,
        products
      });
    }

    // ───────────────────────────────────────────────
    // ACTION: apply
    // ───────────────────────────────────────────────
    if (action === 'apply') {
      if (!Array.isArray(product_ids) || product_ids.length === 0) {
        return Response.json({ error: 'product_ids obrigatório (array não vazio)' }, { status: 400 });
      }

      // Revalida cada produto antes de aplicar (segurança contra race condition)
      let updated = 0;
      let skipped = 0;
      const errors = [];

      for (const pid of product_ids) {
        try {
          const prod = await base44.asServiceRole.entities.Product.filter({ id: pid });
          const p = Array.isArray(prod) ? prod[0] : prod;
          if (!p) { skipped++; continue; }

          const retail = p.selling_price_retail || 0;
          const catalog = p.price_catalog || 0;

          // Revalida critério
          if (!p.catalog_active || retail <= 0 || catalog <= 0 || Math.abs(catalog - retail) < 0.01) {
            skipped++;
            continue;
          }

          await base44.asServiceRole.entities.Product.update(p.id, {
            price_catalog: retail
          });
          updated++;
        } catch (err) {
          errors.push({ id: pid, error: err.message });
        }
      }

      return Response.json({
        success: true,
        updated,
        skipped,
        errors_count: errors.length,
        errors: errors.slice(0, 10)
      });
    }

    return Response.json({
      error: 'Ação inválida. Use: count | preview | apply'
    }, { status: 400 });

  } catch (error) {
    console.error('[syncCatalogPrices] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});