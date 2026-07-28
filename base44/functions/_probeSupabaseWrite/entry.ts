// SONDA TEMPORÁRIA — apagar depois. Confirma se a function Base44 consegue
// ler os secrets do Supabase e escrever/apagar na tabela real via service_role REST.
Deno.serve(async () => {
  const url =
    Deno.env.get('SUPABASE_URL') ||
    Deno.env.get('VITE_SUPABASE_URL') ||
    Deno.env.get('PUBLIC_SUPABASE_URL') || null;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || null;

  const report: Record<string, unknown> = {
    has_url: !!url,
    url_preview: url ? url.replace(/^(https?:\/\/[^.]+).*/, '$1...') : null,
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
    const insBody = await insResp.json().catch(() => null);
    report.insert_status = insResp.status;
    report.insert_ok = insResp.ok;
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