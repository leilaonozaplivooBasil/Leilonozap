import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { MercadoPagoConfig, Preference } from 'npm:mercadopago@2.0.15';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { cart_items, user_data } = await req.json();
    
    if (!cart_items || cart_items.length === 0) {
      return Response.json({ error: 'Carrinho vazio' }, { status: 400 });
    }

    const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
    if (!accessToken) {
      return Response.json({ error: 'Token do Mercado Pago não configurado' }, { status: 500 });
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    // Monta os itens para o Mercado Pago
    const items = cart_items.map(item => ({
      id: item.id,
      title: item.description || 'Produto do Catálogo',
      quantity: item.quantity || 1,
      unit_price: item.price_catalog || item.selling_price_wholesale || 0,
      currency_id: 'BRL',
      picture_url: item.image_urls?.[0] || ''
    }));

    // Calcula o total
    const total = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    // Gera um ID de referência única
    const referenceId = `CART_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Cria a preferência
    const preferenceData = {
      items,
      payer: {
        name: user_data?.full_name || '',
        email: user_data?.email || '',
        phone: {
          number: user_data?.phone?.replace(/\D/g, '') || ''
        },
        identification: {
          type: 'CPF',
          number: user_data?.cpf?.replace(/\D/g, '') || ''
        }
      },
      back_urls: {
        success: `${req.headers.get('origin')}/PaymentSuccess?ref=${referenceId}`,
        failure: `${req.headers.get('origin')}/PaymentFailure?ref=${referenceId}`,
        pending: `${req.headers.get('origin')}/PaymentSuccess?ref=${referenceId}&status=pending`
      },
      auto_return: 'approved',
      external_reference: referenceId,
      statement_descriptor: 'LEILAO NOZAP',
      notification_url: `https://leilaonozap.app/api/mercadoPagoWebhook`
    };

    const result = await preference.create({ body: preferenceData });

    // Salva a venda pendente no banco
    try {
      await base44.asServiceRole.entities.CatalogSale.create({
        reference_id: referenceId,
        buyer_id: user_data?.id || '',
        buyer_name: user_data?.full_name || '',
        buyer_email: user_data?.email || '',
        buyer_phone: user_data?.phone || '',
        buyer_cpf: user_data?.cpf || '',
        items: JSON.stringify(cart_items),
        total_amount: total,
        status: 'pending',
        payment_method: 'mercadopago',
        mp_preference_id: result.id
      });
    } catch (dbError) {
      console.error('Erro ao salvar venda pendente:', dbError);
    }

    return Response.json({
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
      preference_id: result.id,
      reference_id: referenceId
    });

  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});