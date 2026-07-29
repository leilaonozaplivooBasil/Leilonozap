import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
// v1.1 - forçar sync (marca arquivo como modificado para o próximo build incluir esta function)

// Lê BatchRegistration + LoteRecebido com service_role (ignora RLS), só para admin.
// Motivo: o RLS do Supabase nega leitura dessas duas tabelas para a chave do app,
// então a tela RegisterBatches ficava em 0. Aqui devolvemos os dados reais.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [batches, lotes] = await Promise.all([
      base44.asServiceRole.entities.BatchRegistration.list('-created_date', 200),
      base44.asServiceRole.entities.LoteRecebido.list('-created_date', 200),
    ]);

    return Response.json({
      batches: Array.isArray(batches) ? batches : [],
      lotes: Array.isArray(lotes) ? lotes : [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});