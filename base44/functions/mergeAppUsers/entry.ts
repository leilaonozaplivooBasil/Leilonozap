import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    const me = await base44.auth.me().catch(() => null);
    if (!me || me.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const primaryUserId = payload.primary_user_id;
    const duplicateUserId = payload.duplicate_user_id;

    if (!primaryUserId || !duplicateUserId || primaryUserId === duplicateUserId) {
      return Response.json({ error: 'Invalid user ids' }, { status: 400 });
    }

    // Load users
    const [primaryRows, dupRows] = await Promise.all([
      base44.asServiceRole.entities.AppUser.filter({ id: primaryUserId }),
      base44.asServiceRole.entities.AppUser.filter({ id: duplicateUserId })
    ]);

    if (!Array.isArray(primaryRows) || primaryRows.length === 0) {
      return Response.json({ error: `Primary user not found: ${primaryUserId}` }, { status: 404 });
    }
    if (!Array.isArray(dupRows) || dupRows.length === 0) {
      return Response.json({ error: `Duplicate user not found: ${duplicateUserId}` }, { status: 404 });
    }

    const primary = primaryRows[0];
    const duplicate = dupRows[0];

    const changes = [];

    // 1) CommissionRecord: user_id -> primary, anchor_user_id -> primary se necessário
    const recsForDup = await base44.asServiceRole.entities.CommissionRecord.filter({ user_id: duplicateUserId }, '-created_date', 10000);
    for (const r of recsForDup) {
      await base44.asServiceRole.entities.CommissionRecord.update(r.id, {
        user_id: primaryUserId,
        user_name: primary.full_name || r.user_name
      });
      changes.push({ entity: 'CommissionRecord', id: r.id, field: 'user_id', from: duplicateUserId, to: primaryUserId });
    }

    const recsAnchoredDup = await base44.asServiceRole.entities.CommissionRecord.filter({ anchor_user_id: duplicateUserId }, '-created_date', 10000);
    for (const r of recsAnchoredDup) {
      await base44.asServiceRole.entities.CommissionRecord.update(r.id, {
        anchor_user_id: primaryUserId,
        anchor_user_name: primary.full_name || r.anchor_user_name
      });
      changes.push({ entity: 'CommissionRecord', id: r.id, field: 'anchor_user_id', from: duplicateUserId, to: primaryUserId });
    }

    // 2) CatalogSale: licensee_id -> primary (quando igual ao duplicado)
    const salesByDupAsLicensee = await base44.asServiceRole.entities.CatalogSale.filter({ licensee_id: duplicateUserId }, '-created_date', 10000);
    for (const s of salesByDupAsLicensee) {
      await base44.asServiceRole.entities.CatalogSale.update(s.id, { licensee_id: primaryUserId, licensee_name: primary.full_name || s.licensee_name });
      changes.push({ entity: 'CatalogSale', id: s.id, field: 'licensee_id', from: duplicateUserId, to: primaryUserId });
    }

    // 3) Referências comuns com user_id direto
    const refEntities = [
      { name: 'FavoriteAuction', field: 'user_id' },
      { name: 'AuctionView', field: 'user_id' },
      { name: 'UserPreference', field: 'user_id' },
      { name: 'Wallet', field: 'user_id' },
      { name: 'WalletTransaction', field: 'user_id' },
      { name: 'MercadoPagoPayment', field: 'user_id' },
    ];

    for (const ref of refEntities) {
      try {
        const rows = await base44.asServiceRole.entities[ref.name].filter({ [ref.field]: duplicateUserId }, '-created_date', 10000);
        for (const row of rows) {
          await base44.asServiceRole.entities[ref.name].update(row.id, { [ref.field]: primaryUserId });
          changes.push({ entity: ref.name, id: row.id, field: ref.field, from: duplicateUserId, to: primaryUserId });
        }
      } catch (_) { /* entity might not exist or be empty; ignore */ }
    }

    // 4) Delete duplicate user
    await base44.asServiceRole.entities.AppUser.delete(duplicateUserId);

    // 5) Resync balances for this email (best effort)
    try {
      await base44.functions.invoke('resyncUserBalances', { email: (primary.email || '').toLowerCase() });
    } catch (_) {}

    return Response.json({
      success: true,
      primary_user_id: primaryUserId,
      duplicate_user_id: duplicateUserId,
      changes_count: changes.length,
      changes
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});