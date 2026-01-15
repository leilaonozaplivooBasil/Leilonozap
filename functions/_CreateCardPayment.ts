import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await base44.functions.invoke('asaasCreateCardPayment', payload);
    return Response.json(result?.data ?? result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
});