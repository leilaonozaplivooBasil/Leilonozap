import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function sbFetch(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { buyer_ids } = await req.json();

    // 1) inspect catalog_sales columns (1 row)
    const sample = await sbFetch('catalog_sales?select=*&limit=1');

    // 2) check if 'kind' column / wallet_deposit rows exist at all
    const kindProbe = await sbFetch('catalog_sales?select=id,buyer_id,kind,status,sale_price,created_date&kind=eq.wallet_deposit&limit=20');

    // 3) query for the specific buyer_ids passed in, regardless of kind
    let byBuyer = null;
    if (buyer_ids && buyer_ids.length) {
      const idsParam = buyer_ids.join(',');
      const raw = await sbFetch(`catalog_sales?select=buyer_id,buyer_name,kind,status,sale_price,mp_payment_id,created_date&buyer_id=in.(${idsParam})&order=created_date.desc`);
      if (raw.status === 200 && Array.isArray(raw.body)) {
        byBuyer = raw.body.map((r: any) => `${r.buyer_id}|${r.buyer_name}|${r.kind}|${r.status}|${r.sale_price}|${r.mp_payment_id}|${(r.created_date||'').slice(0,10)}`);
      } else {
        byBuyer = raw;
      }
    }

    // 4) check app_users balances for these ids
    let balances = null;
    if (buyer_ids && buyer_ids.length) {
      const idsParam = buyer_ids.join(',');
      balances = await sbFetch(`app_users?select=id,full_name,saldo_disponivel,saldo_alocado&id=in.(${idsParam})`);
    }

    return Response.json({
      by_buyer_ids: byBuyer,
      balances,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});