import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').toLowerCase();
    const dryRun = body.dryRun === true; // default false
    const targetSaleIds = Array.isArray(body.sale_ids) ? body.sale_ids : null;

    if (!email) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }

    // Find target AppUser by email
    const users = await base44.asServiceRole.entities.AppUser.filter({ email });
    if (!users || users.length === 0) {
      return Response.json({ error: `User not found for email ${email}` }, { status: 404 });
    }
    const target = users[0];

    // Load all commission records for this user (both catalog and auction)
    const allRecords = await base44.asServiceRole.entities.CommissionRecord.filter({ user_id: target.id }, '-created_date', 10000);

    // Optional filter by sale_ids
    const records = targetSaleIds ? allRecords.filter(r => targetSaleIds.includes(r.sale_id)) : allRecords;

    // Build groups: key = sale_id|role|amount(2d)|percent(3d)
    const groups = new Map();
    for (const r of records) {
      const saleId = r.sale_id || 'null';
      const role = r.role || 'unknown';
      const amount = round2(r.amount);
      const percent = Math.round((Number(r.percent) || 0) * 1000) / 1000; // 3 decimals precision
      const key = `${saleId}|${role}|${amount.toFixed(2)}|${percent.toFixed(3)}|${target.id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }

    const duplicates = [];
    const kept = [];

    // For each group with more than 1, choose the best to keep: prefer paid>confirmed>pending, then earliest created_date
    for (const [key, arr] of groups.entries()) {
      if (arr.length <= 1) continue;
      const sorted = arr.slice().sort((a, b) => {
        const rank = (s) => (s === 'paid' ? 3 : s === 'confirmed' ? 2 : s === 'pending' ? 1 : 0);
        const rd = rank(b.status) - rank(a.status);
        if (rd !== 0) return rd;
        const da = new Date(a.created_date || 0).getTime();
        const db = new Date(b.created_date || 0).getTime();
        return da - db; // keep earliest if same status
      });
      const keep = sorted[0];
      kept.push({ id: keep.id, sale_id: keep.sale_id, role: keep.role, amount: round2(keep.amount), status: keep.status });
      for (let i = 1; i < sorted.length; i++) {
        const d = sorted[i];
        duplicates.push(d);
      }
    }

    // Delete duplicates
    const deleted = [];
    if (!dryRun) {
      for (const d of duplicates) {
        await base44.asServiceRole.entities.CommissionRecord.delete(d.id);
        deleted.push({ id: d.id, sale_id: d.sale_id, role: d.role, amount: round2(d.amount), status: d.status });
      }
    }

    // Re-sync balances for the user
    let resync = null;
    if (!dryRun) {
      try {
        resync = await base44.functions.invoke('resyncUserBalances', { email });
      } catch (_) {}
    }

    return Response.json({
      success: true,
      scope: { email, sale_ids: targetSaleIds },
      analyzed_records: records.length,
      duplicate_groups: duplicates.length > 0 ? 'found' : 'none',
      duplicates_count: duplicates.length,
      kept_count: kept.length,
      dryRun,
      kept,
      deleted,
      balance_resync: resync && resync.data ? resync.data : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});