// Escrita segura de LoteRecebido (painel Estoque de Lotes) — CONTRA O SUPABASE REAL.
//
// CAUSA-RAIZ da falha anterior (registrada na memória do projeto):
// a versão antiga usava base44.asServiceRole.entities.LoteRecebido, que aponta para o
// STORE INTERNO do Base44 — NÃO para o Supabase de produção onde os lotes realmente vivem.
// Resultado: create "funcionava" (no store errado), mas update/delete de lotes reais dava
// 404 "Entity not found" e o front exibia "not_implemented"/"Falha ao excluir".
//
// Esta versão fala DIRETO com o Supabase via REST + service_role (mesmo padrão validado em
// _probeSupabaseWrite e entityWrite), então funciona igual no preview-sandbox e no publicado.
// A tabela tem RLS write = admin-only; o service_role ignora RLS, por isso validamos o admin
// aqui (via caller_email na tabela app_users) antes de executar qualquer escrita.

function getSupabase() {
  const rawUrl = Deno.env.get('SUPABASE_URL') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  // Normaliza: remove /rest/v1 e barras finais para evitar duplicação de caminho
  const baseUrl = rawUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  return { baseUrl, key, ok: !!baseUrl && !!key };
}

function sbHeaders(key: string, extra: Record<string, string> = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

Deno.serve(async (req) => {
  try {
    const { baseUrl, key, ok } = getSupabase();
    if (!ok) {
      return Response.json({ error: 'Configuração do Supabase ausente (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' }, { status: 500 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch (_) {
      return Response.json({ error: 'Body JSON inválido' }, { status: 400 });
    }

    const { method, id, data, caller_email } = body as {
      method?: string; id?: string; data?: Record<string, unknown>; caller_email?: string;
    };

    if (!method) {
      return Response.json({ error: 'method é obrigatório' }, { status: 400 });
    }

    // SEGURANÇA: valida se o caller_email é admin/super_admin na tabela app_users (Supabase real).
    // O app usa login custom (AppUser via localStorage), sem sessão de auth Base44 — então a
    // autorização é feita pelo email que o front envia, checado contra o banco real.
    if (!caller_email) {
      return Response.json({ error: 'Não autorizado - caller_email ausente' }, { status: 403 });
    }

    const userResp = await fetch(
      `${baseUrl}/rest/v1/app_users?email=eq.${encodeURIComponent(caller_email)}&select=role`,
      { headers: sbHeaders(key) },
    );
    const users = await userResp.json().catch(() => []);
    const role = Array.isArray(users) && users[0] ? users[0].role : null;
    const isAuthorized = role === 'admin' || role === 'super_admin';

    if (!isAuthorized) {
      return Response.json({ error: 'Não autorizado - apenas admin' }, { status: 403 });
    }

    const table = `${baseUrl}/rest/v1/lotes_recebidos`;
    let result: unknown;

    if (method === 'create') {
      const resp = await fetch(table, {
        method: 'POST',
        headers: sbHeaders(key, { Prefer: 'return=representation' }),
        body: JSON.stringify(data || {}),
      });
      const rows = await resp.json().catch(() => null);
      if (!resp.ok) {
        return Response.json({ error: `Falha ao criar (${resp.status})`, details: rows }, { status: 500 });
      }
      result = Array.isArray(rows) ? rows[0] : rows;

    } else if (method === 'update') {
      if (!id) return Response.json({ error: 'id é obrigatório para update' }, { status: 400 });
      const resp = await fetch(`${table}?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: sbHeaders(key, { Prefer: 'return=representation' }),
        body: JSON.stringify(data || {}),
      });
      const rows = await resp.json().catch(() => null);
      if (!resp.ok) {
        return Response.json({ error: `Falha ao atualizar (${resp.status})`, details: rows }, { status: 500 });
      }
      result = Array.isArray(rows) ? rows[0] : rows;

    } else if (method === 'delete') {
      if (!id) return Response.json({ error: 'id é obrigatório para delete' }, { status: 400 });
      const resp = await fetch(`${table}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: sbHeaders(key),
      });
      if (!resp.ok) {
        const details = await resp.text().catch(() => '');
        return Response.json({ error: `Falha ao excluir (${resp.status})`, details: details.slice(0, 300) }, { status: 500 });
      }
      result = { deleted: true };

    } else {
      return Response.json({ error: `Método '${method}' não suportado. Use 'update', 'create' ou 'delete'` }, { status: 400 });
    }

    return Response.json({ data: result });
  } catch (error) {
    console.error('loteRecebidoWrite error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});