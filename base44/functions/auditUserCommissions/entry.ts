import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function approxEqual(a, b, tol = 0.01) {
  return Math.abs(Number(a) - Number(b)) <= tol;
}

const DIRECTOR_PLUS = new Set(['diretor', 'diretoria', 'ceo', 'conselheiro', 'fundador']);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me || me.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').toLowerCase();
    if (!email) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }

    // Resolve user
    const users = await base44.asServiceRole.entities.AppUser.filter({ email });
    if (!users || users.length === 0) {
      return Response.json({ error: `User not found for email ${email}` }, { status: 404 });
    }
    const user = users[0];

    // Load this user's commission records
    const userRecs = await base44.asServiceRole.entities.CommissionRecord.filter({ user_id: user.id }, '-created_date', 10000);

    const saleIds = Array.from(new Set(userRecs.map(r => r.sale_id).filter(Boolean)));
    const saleFindings = [];
    const duplicateFindings = [];
    const roleSplitFindings = [];
    const singleRecipientRoleFindings = [];
    const anchorFindings = [];
    const percentSumFindings = [];

    // Aggregate for balance cross-check
    let totalCatalogUser = 0;
    let totalAppUser = 0;

    // Audit each sale where this user has record(s)
    for (const saleId of saleIds) {
      // All records of this sale across all users
      const saleRecs = await base44.asServiceRole.entities.CommissionRecord.filter({ sale_id: saleId }, '-created_date', 10000);
      const catalogRecs = saleRecs.filter(r => (r.sale_type || 'catalog') === 'catalog');

      // Try to get sale amount
      let saleAmount = null;
      const recWithAmount = catalogRecs.find(r => r.sale_amount != null);
      if (recWithAmount && typeof recWithAmount.sale_amount === 'number') {
        saleAmount = recWithAmount.sale_amount;
      } else {
        // Fallback to CatalogSale
        const saleRows = await base44.asServiceRole.entities.CatalogSale.filter({ id: saleId });
        if (saleRows && saleRows.length > 0) {
          saleAmount = saleRows[0].total_amount ?? saleRows[0].sale_price ?? saleRows[0].total_amount;
        }
      }

      // Flags: duplicates within this sale for the user
      const keyMap = new Map();
      for (const r of saleRecs.filter(r => r.user_id === user.id)) {
        const key = `${r.user_id}|${r.role}|${round2(r.amount)}|${round2(r.percent)}|${r.status}`;
        if (!keyMap.has(key)) keyMap.set(key, []);
        keyMap.get(key).push(r);
      }
      for (const [k, arr] of keyMap.entries()) {
        if (arr.length > 1) {
          duplicateFindings.push({ sale_id: saleId, count: arr.length, role: arr[0].role, amount: round2(arr[0].amount), percent: round2(arr[0].percent), status: arr[0].status, record_ids: arr.map(x => x.id) });
        }
      }

      // Role split checks for Director+ (should be equal shares per role)
      const byRole = catalogRecs.reduce((acc, r) => {
        const role = (r.role || 'unknown').toLowerCase();
        if (!acc[role]) acc[role] = [];
        acc[role].push(r);
        return acc;
      }, {});

      for (const role of Object.keys(byRole)) {
        const arr = byRole[role];
        if (DIRECTOR_PLUS.has(role)) {
          if (arr.length > 1) {
            const amounts = arr.map(x => round2(x.amount)).sort((a, b) => a - b);
            const min = amounts[0];
            const max = amounts[amounts.length - 1];
            if (!approxEqual(min, max)) {
              roleSplitFindings.push({ sale_id: saleId, role, unequal_amounts: amounts, record_ids: arr.map(x => x.id) });
            }
          }
        } else {
          // For single-recipient roles, there must be at most 1 recipient
          if (arr.length > 1) {
            singleRecipientRoleFindings.push({ sale_id: saleId, role, recipients: arr.map(x => ({ user_id: x.user_id, amount: round2(x.amount), id: x.id })) });
          }
        }
      }

      // Anchor check: expect a licenciado_catalogo record with ~13%
      const anchorRec = catalogRecs.find(r => (r.role || '').toLowerCase() === 'licenciado_catalogo');
      if (!anchorRec) {
        anchorFindings.push({ sale_id: saleId, issue: 'missing_anchor_record' });
      } else if (saleAmount) {
        const expected = round2(saleAmount * 0.13);
        if (!approxEqual(round2(anchorRec.amount), expected)) {
          anchorFindings.push({ sale_id: saleId, issue: 'anchor_amount_mismatch', expected, got: round2(anchorRec.amount), record_id: anchorRec.id });
        }
      }

      // Percent sum check ~ 26% for confirmed/paid
      if (saleAmount) {
        const eligible = catalogRecs.filter(r => ['confirmed', 'paid'].includes(r.status));
        const sumAmounts = round2(eligible.reduce((s, r) => s + (Number(r.amount) || 0), 0));
        const expectedTotal = round2(saleAmount * 0.26);
        if (!approxEqual(sumAmounts, expectedTotal)) {
          percentSumFindings.push({ sale_id: saleId, sale_amount: round2(saleAmount), distributed: sumAmounts, expected: expectedTotal, diff: round2(sumAmounts - expectedTotal) });
        }
      }

      saleFindings.push({ sale_id: saleId, sale_amount: saleAmount ?? null });
    }

    // Totals for user's records by type/status
    for (const r of userRecs) {
      const amt = Number(r.amount) || 0;
      if ((r.sale_type || 'catalog') === 'catalog' && ['confirmed', 'paid'].includes(r.status)) totalCatalogUser += amt;
      if ((r.sale_type || 'app') === 'app' && ['confirmed', 'paid'].includes(r.status)) totalAppUser += amt;
    }

    const summary = {
      user: { id: user.id, full_name: user.full_name, email: user.email },
      current_balances: {
        catalog_commission_balance: round2(user.catalog_commission_balance),
        commission_balance: round2(user.commission_balance),
        valora_pay_balance: round2(user.valora_pay_balance),
        catalog_total_commissions_generated: round2(user.catalog_total_commissions_generated),
        total_commissions_generated: round2(user.total_commissions_generated)
      },
      computed_totals_for_user: {
        catalog_confirmed_paid_sum: round2(totalCatalogUser),
        app_confirmed_paid_sum: round2(totalAppUser)
      },
      checks: {
        duplicates: duplicateFindings,
        director_plus_split_issues: roleSplitFindings,
        single_recipient_role_issues: singleRecipientRoleFindings,
        anchor_issues: anchorFindings,
        percent_sum_issues: percentSumFindings
      },
      scope: { sales_checked: saleFindings.length }
    };

    return Response.json({ success: true, summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});