import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { sale_id } = body;

    if (!sale_id) {
      return Response.json({ error: 'sale_id is required' }, { status: 400 });
    }

    // ✅ Bypass RLS via asServiceRole para buscar pedido por ID
    const orders = await base44.asServiceRole.entities.CatalogSale.filter(
      { id: sale_id },
      '-created_date',
      1
    );

    if (!orders || orders.length === 0) {
      return Response.json({ order: null, found: false });
    }

    return Response.json({ order: orders[0], found: true });
  } catch (error) {
    console.error('Error in getCatalogOrderById:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});