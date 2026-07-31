// 🔴 OPERAÇÃO CRÍTICA (autorizada pelo admin) — Reset total de comissões em produção.
// Escopo: cancela TODOS os commission_records e zera os saldos-resumo de comissão em
// TODOS os app_users. NÃO toca em saldo_disponivel/saldo_alocado nem em depósitos
// confirmados (catalog_sales, MercadoPagoPayment, AsaasPayment) — carteira intocada.
// Nenhuma linha é excluída (apenas status/valores atualizados) — histórico auditável.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function sbFetch(path: string, options: any = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: options.method || 'GET',
    body: options.body,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=minimal',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, body: json, headers: res.headers };
}

// Conta linhas sem baixar payload grande (usa Content-Range do Postgrest)
async function countRows(table: string, filter: string = '') {
  const res = await sbFetch(`${table}?select=id${filter}`, {
    headers: { Prefer: 'count=exact', Range: '0-0' },
  });
  const range = res.headers.get('content-range'); // formato "0-0/12345"
  if (range && range.includes('/')) {
    const total = range.split('/')[1];
    return total === '*' ? null : parseInt(total, 10);
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();
    if (!authUser || authUser.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return Response.json({ error: 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados' }, { status: 500 });
    }

    // Contagens ANTES (evidência)
    const totalCommissionRecordsBefore = await countRows('commission_records');
    const totalAppUsers = await countRows('app_users');

    // 1) Cancela TODOS os commission_records (sem filtro de usuário) — não exclui, só marca status
    const cancelRes = await sbFetch('commission_records?id=not.is.null', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'canceled' }),
    });
    if (cancelRes.status >= 300) {
      return Response.json({ error: 'Falha ao cancelar commission_records', details: cancelRes.body }, { status: 500 });
    }

    // 2) Zera os campos-resumo de comissão (top-level) em TODOS os app_users
    //    NÃO inclui saldo_disponivel / saldo_alocado / arrematante_context — carteira intocada
    const zeroTopLevelRes = await sbFetch('app_users?id=not.is.null', {
      method: 'PATCH',
      body: JSON.stringify({
        commission_balance: 0,
        catalog_commission_balance: 0,
        total_commissions_generated: 0,
      }),
    });
    if (zeroTopLevelRes.status >= 300) {
      return Response.json({ error: 'Falha ao zerar saldos de comissão em app_users', details: zeroTopLevelRes.body }, { status: 500 });
    }

    // 3) licenciado_context.commission_balance é JSON — precisa merge individual por registro
    const usersWithContext = await sbFetch('app_users?select=id,licenciado_context&licenciado_context=not.is.null&limit=5000');
    let licenciadoContextChecked = 0;
    let licenciadoContextZeroed = 0;
    if (usersWithContext.status === 200 && Array.isArray(usersWithContext.body)) {
      licenciadoContextChecked = usersWithContext.body.length;
      for (const u of usersWithContext.body) {
        const ctx = u.licenciado_context;
        if (!ctx || typeof ctx !== 'object') continue;
        if (!('commission_balance' in ctx) || Number(ctx.commission_balance) === 0) continue;
        const newContext = { ...ctx, commission_balance: 0 };
        const upd = await sbFetch(`app_users?id=eq.${u.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ licenciado_context: newContext }),
        });
        if (upd.status < 300) licenciadoContextZeroed++;
      }
    }

    // Contagem DEPOIS (evidência)
    const totalCommissionRecordsCanceledAfter = await countRows('commission_records', '&status=eq.canceled');

    return Response.json({
      success: true,
      commission_records_total: totalCommissionRecordsBefore,
      commission_records_canceled_after: totalCommissionRecordsCanceledAfter,
      app_users_total: totalAppUsers,
      app_users_top_level_zeroed: totalAppUsers,
      licenciado_context_checked: licenciadoContextChecked,
      licenciado_context_zeroed: licenciadoContextZeroed,
      wallet_untouched: true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});