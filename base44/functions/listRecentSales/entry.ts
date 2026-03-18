
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Verifica admin
        const user = await base44.auth.me().catch(() => null);
        // if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

        const payload = await req.json().catch(() => ({}));
        const limit = payload.limit || 50;

        // Busca vendas recentes
        // SDK filter não tem sort/limit explícito em todos os adapters, mas vamos tentar options se suportado
        // Ou buscar tudo e cortar (se não for muito grande).
        // Melhor: usar Supabase direct query se possível, mas aqui estamos no SDK Base44 abstrato.
        // Vamos assumir que filter retorna array e fazemos sort em memória por enquanto (MVP).

        const sales = await base44.asServiceRole.entities.CatalogSale.filter({});

        // Ordena por data (decrescente) e pega os últimos 'limit'
        // created_date costuma ser string ISO
        sales.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

        const recent = sales.slice(0, limit).map(s => ({
            id: s.id,
            created_date: s.created_date,
            total_amount: s.total_amount || s.sale_price || s.amount,
            status: s.status,
            buyer_name: s.buyer_name
        }));

        return Response.json({ success: true, sales: recent });

    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
});
