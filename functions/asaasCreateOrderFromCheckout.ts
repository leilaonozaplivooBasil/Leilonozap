import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me();
    const { orderNumber, items, totalAmount, buyer } = await req.json();
    if (!orderNumber || !totalAmount || !buyer?.name || !buyer?.cpfCnpj || !buyer?.mobilePhone) {
      return Response.json({ error: 'Dados insuficientes' }, { status: 400 });
    }
    const order = await base44.entities.AsaasOrder.create({
      orderNumber,
      items,
      totalAmount,
      status: 'CREATED',
      buyer,
      cpfCnpj: String(buyer.cpfCnpj).replace(/\D/g,''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return Response.json({ order });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});