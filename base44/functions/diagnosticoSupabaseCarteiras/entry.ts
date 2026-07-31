import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

// 🔍 DIAGNÓSTICO — SOMENTE LEITURA. Não escreve em nenhuma tabela.
// Consulta direta no Supabase (fonte de verdade) para investigar divergências
// de saldo/depósitos reportadas em 31/07. Admin-only.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    let SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SR) {
      return Response.json({ error: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes' }, { status: 500 });
    }
    // 🛡️ Normaliza: o secret já vem com /rest/v1/ incluso — remove pra não duplicar o path
    SUPABASE_URL = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

    async function sb(path) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: { apikey: SR, Authorization: `Bearer ${SR}` }
      });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = text; }
      return { ok: res.ok, status: res.status, body: json };
    }

    // sanity check simples primeiro
    const sanity = await sb('app_users?select=id,full_name&limit=1');

    const result = {};
    const { skip_users, mode } = await req.json().catch(() => ({}));

    if (!skip_users) {
      const names = ['Luciano Pinheiro', 'Iara Figueiredo', 'Beatriz', 'Cristiano Ribeiro', 'Elenice Lima'];
      const usersFound = {};
      for (const n of names) {
        const r = await sb(`app_users?select=id,full_name,email,saldo_disponivel,commission_balance&full_name=ilike.*${encodeURIComponent(n)}*`);
        usersFound[n] = r;
      }
      const luiz = await sb(`app_users?select=id,full_name,email,saldo_disponivel,commission_balance&id=eq.68db0ff2c19838a827fb6e5f`);
      usersFound['Luiz Santanna'] = luiz;
      result.app_users = usersFound;
    }

    if (mode === 'deposits') {
      const salesDeposits = await sb(`catalog_sales?select=id,buyer_id,buyer_name,kind,total_amount,status,mp_payment_id,created_at&kind=in.(wallet_deposit,commission_deposit)&created_at=gte.2026-07-29T00:00:00&created_at=lt.2026-08-01T00:00:00&order=created_at.desc`);
      result.catalog_sales_deposits_29_30 = salesDeposits;
    }

    if (mode === 'tables') {
      const candidateTables = ['wallet_transactions', 'digital_wallet_transactions', 'commission_ledger'];
      const walletTx = {};
      for (const t of candidateTables) {
        walletTx[t] = await sb(`${t}?select=*&order=created_at.desc&limit=10`);
      }
      result.candidate_wallet_tables = walletTx;
    }

    if (mode === 'mp') {
      const mpPaid = await sb(`catalog_sales?select=id,buyer_id,buyer_name,kind,total_amount,status,mp_payment_id,created_at&mp_payment_id=not.is.null&status=eq.paid&created_at=gte.2026-07-29T00:00:00&order=created_at.desc&limit=50`);
      result.mp_paid_catalog_sales = mpPaid;
    }

    if (mode === 'cristiano') {
      const c1 = await sb(`app_users?select=id,full_name,email,saldo_disponivel,commission_balance&full_name=ilike.*Cristiano*`);
      result.cristiano_search = c1;
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});