import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { buyer_id } = body;

    if (!buyer_id) {
      return Response.json({ error: 'buyer_id is required' }, { status: 400 });
    }

    // ✅ Busca com asServiceRole - sem RLS
    const orders = await base44.asServiceRole.entities.CatalogSale.filter(
      { buyer_id: buyer_id },
      '-created_date',
      500
    );

    return Response.json({ orders: orders || [] });
  } catch (error) {
    console.error('Error in getMyCatalogOrders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});