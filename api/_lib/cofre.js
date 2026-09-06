// 🔐 O COFRE (app_segredos) — chave que não está no ambiente da Vercel pode
// estar na tabela, colada pelo dono sem redeploy. Mesma leitura que o
// xmusicBuscar já fazia; aqui pra mais de uma rota usar.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function segredo(id) {
  try {
    if (!SUPABASE_URL || !SR) return null;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/app_segredos?id=eq.${encodeURIComponent(id)}&select=valor&limit=1`, {
      headers: { apikey: SR, Authorization: `Bearer ${SR}` },
      signal: AbortSignal.timeout(5000),
    });
    const j = await r.json().catch(() => []);
    return Array.isArray(j) && j[0]?.valor ? String(j[0].valor) : null;
  } catch { return null; }
}

/** Variável de ambiente primeiro; senão o cofre. */
export async function chaveDe(nomeEnv, idNoCofre) {
  return process.env[nomeEnv] || segredo(idNoCofre);
}
