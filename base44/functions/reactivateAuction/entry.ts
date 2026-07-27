import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * Reativa leilão no banco Supabase usando service role key (bypassa RLS).
 * O frontend não tem sessão Supabase Auth, então RLS bloqueia updates silenciosamente.
 * Esta função usa a service role key para garantir que o update seja efetivado.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
    }

    const { auctionId, payload } = await req.json();

    if (!auctionId || !payload) {
      return Response.json({ error: 'auctionId e payload são obrigatórios' }, { status: 400 });
    }

    const supabaseUrl = 'https://gezvviyegtxytnwjkrjv.supabase.co';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!serviceKey) {
      return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada' }, { status: 500 });
    }

    // Usa a service role key para bypassar RLS
    const resp = await fetch(`${supabaseUrl}/rest/v1/auctions?id=eq.${auctionId}`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        'Content-Profile': 'public'
      },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error('❌ [REACTIVATE] Erro Supabase:', data);
      return Response.json({ error: data?.message || 'Falha ao atualizar leilão no Supabase' }, { status: resp.status });
    }

    if (!data || data.length === 0) {
      return Response.json({ error: 'Leilão não encontrado ou update não efetivado' }, { status: 404 });
    }

    console.log(`✅ [REACTIVATE] Leilão ${auctionId} reativado com sucesso`);

    return Response.json({
      success: true,
      message: 'Leilão reativado com sucesso',
      auction: data[0]
    });

  } catch (error) {
    console.error('❌ [REACTIVATE] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});