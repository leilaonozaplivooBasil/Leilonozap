import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Repassa o payload exatamente como veio
    const payload = await req.json();

    // Garante usuário autenticado (mesma política do destino)
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Encaminha para a função oficial
    const result = await base44.functions.invoke('asaasCreateCardPayment', payload);

    // O SDK retorna { data, status, headers... } — aqui retornamos só o data
    return Response.json(result?.data ?? result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
});