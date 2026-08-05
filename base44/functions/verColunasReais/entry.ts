// ─────────────────────────────────────────────
// FUNÇÃO: verColunasReais
// O QUE FAZ: lista as colunas REAIS de tabelas do Supabase de produção.
//            Evita o erro 42703 (pedir coluna que não existe).
// USADO POR: auditoria interna
// ÚLTIMA MUDANÇA: 04/08/2026
// ─────────────────────────────────────────────
// 🛡️ 100% LEITURA. Só GET.

const RAW = Deno.env.get('SUPABASE_URL') || '';
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BASE = RAW.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  const tabelas: string[] = body.tabelas || ['catalog_sales', 'commission_records'];
  const out: any = {};
  for (const t of tabelas) {
    try {
      const res = await fetch(`${BASE}/rest/v1/${t}?select=*&limit=1`, {
        headers: { apikey: SR, Authorization: `Bearer ${SR}` },
      });
      if (!res.ok) { out[t] = { erro: `HTTP ${res.status}` }; continue; }
      const d = await res.json();
      out[t] = Array.isArray(d) && d[0] ? Object.keys(d[0]).sort() : { vazia: true };
    } catch (e) {
      out[t] = { erro: String(e?.message || e) };
    }
  }
  return Response.json({ success: true, colunas: out });
});