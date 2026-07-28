// SONDA TEMPORÁRIA — apagar depois. Confirma se a function Base44 consegue
// ler os secrets do Supabase e escrever/apagar na tabela real via service_role REST.
Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL') || null;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || null;

  const report: Record<string, unknown> = {
    has_url: !!url,
    url_full: url,
    url_len: url ? url.length : 0,
    has_service_key: !!key,
  };

  if (!url || !key) {
    report.conclusion = 'MISSING_SECRETS';
    return Response.json(report);
  }

  const base = `${url}/rest/v1/lotes_recebidos`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  try {
    // 1) INSERT
    const insResp = await fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({ nome_lote: 'ZZZ PROBE (apagar)', marketplace: 'Outros', status: 'recebido' }),
    });
    const insText = await insResp.text().catch(() => '');
    let insBody = null;
    try { insBody = JSON.parse(insText); } catch { /* não-JSON */ }
    report.insert_status = insResp.status;
    report.insert_ok = insResp.ok;
    report.insert_body = insText.slice(0, 300);
    report.target_url = base;
    const newId = Array.isArray(insBody) && insBody[0]?.id ? insBody[0].id : null;
    report.inserted_id = newId;

    if (newId) {
      // 2) DELETE (limpa a sonda)
      const delResp = await fetch(`${base}?id=eq.${newId}`, { method: 'DELETE', headers });
      report.delete_status = delResp.status;
      report.delete_ok = delResp.ok;
    }
    report.conclusion = insResp.ok && newId ? 'WRITE_OK' : 'WRITE_FAILED';
  } catch (e) {
    report.conclusion = 'EXCEPTION';
    report.error = String((e as Error)?.message || e);
  }

  return Response.json(report);
});