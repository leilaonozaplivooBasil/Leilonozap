// 🔎 SOMENTE LEITURA — lista quem tem cargo de executivo na produção.
// Serve para desenhar a resolução automática do executivo da linha.
Deno.serve(async () => {
  const raw = Deno.env.get('SUPABASE_URL') || '';
  const base = raw.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const sb = async (path: string) => {
    const r = await fetch(`${base}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    return await r.json();
  };

  const rows = await sb('app_users?select=id,full_name,career_levels,primary_career_level,referred_by_id&limit=5000');
  const lv = (u: any) => Array.isArray(u.career_levels) ? u.career_levels : (u.career_levels ? [u.career_levels] : []);

  const contagem: Record<string, number> = {};
  for (const u of rows) for (const l of lv(u)) contagem[l] = (contagem[l] || 0) + 1;

  const execs = rows.filter((u: any) =>
    lv(u).some((l: string) => String(l).startsWith('executivo')) ||
    String(u.primary_career_level || '').startsWith('executivo')
  );

  return Response.json({
    total_contas: rows.length,
    cargos_existentes: contagem,
    executivos: execs.map((u: any) => ({
      id: u.id, nome: u.full_name, levels: lv(u), primary: u.primary_career_level,
    })),
  });
});