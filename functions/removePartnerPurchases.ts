import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { targetEmail, partnerName } = await req.json();

    // Buscar usuário target
    const targetUsers = await base44.entities.AppUser.filter({ email: targetEmail });
    if (!targetUsers || targetUsers.length === 0) {
      return Response.json({ error: 'Target user not found' }, { status: 404 });
    }

    const targetUser = targetUsers[0];

    // Buscar todas as CatalogSale onde esse usuário é licensee e o partner name aparece
    const catalogSales = await base44.entities.CatalogSale.filter({
      licensee_id: targetUser.id
    }, '-created_date', 1000);

    let deletedCount = 0;

    if (catalogSales && Array.isArray(catalogSales)) {
      for (const sale of catalogSales) {
        // Se o nome do licenciado ou buyer contém o partner name, deleta
        if (
          (sale.licensee_name && sale.licensee_name.includes(partnerName)) ||
          (sale.buyer_name && sale.buyer_name.includes(partnerName))
        ) {
          try {
            await base44.entities.CatalogSale.delete(sale.id);
            deletedCount++;
          } catch (delErr) {
            console.warn(`Erro ao deletar venda ${sale.id}:`, delErr.message);
          }
        }
      }
    }

    // Log da operação
    await base44.entities.SystemLog.create({
      step: 'removePartnerPurchases',
      status: 'success',
      message: `Removed ${deletedCount} purchases for partner "${partnerName}" from user ${targetEmail}`,
      component_name: 'removePartnerPurchases',
      payload: {
        targetEmail,
        partnerName,
        deletedCount
      }
    }).catch(() => {});

    return Response.json({
      success: true,
      targetUser: targetUser.email,
      partnerRemoved: partnerName,
      deletedSales: deletedCount
    });

  } catch (error) {
    console.error('Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});