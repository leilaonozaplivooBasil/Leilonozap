import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

// 🛡️ Rede de segurança: o webhook do Mercado Pago às vezes não chega (não está
// registrado/configurado). Esta função verifica DIRETO na API do Mercado Pago
// todo depósito de carteira que ainda está "pending" no nosso banco e credita
// o usuário se o pagamento já foi aprovado de verdade. Roda em automação
// agendada, então nenhum depósito real fica travado esperando um webhook.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const accessToken = Deno.env.get('MP_ACCESS_TOKEN')?.trim();
        if (!accessToken) {
            return Response.json({ error: 'MP_ACCESS_TOKEN não configurada' }, { status: 500 });
        }

        const pendentes = await base44.asServiceRole.entities.MercadoPagoPayment.filter({
            deposit_type: 'digital_wallet',
            status: 'pending'
        });

        const resultados = [];

        for (const p of pendentes) {
            // Ignora registros de teste (não são pagamentos reais no MP)
            if (!p.payment_id || p.payment_id.startsWith('payment_test')) continue;

            try {
                const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${p.payment_id}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                const mpData = await mpRes.json();

                if (!mpRes.ok || mpData.status !== 'approved') {
                    resultados.push({ payment_id: p.payment_id, status_mp: mpData.status || 'erro', acao: 'nenhuma' });
                    continue;
                }

                // ✅ Aprovado no MP mas ainda pending aqui → credita agora
                const wallets = await base44.asServiceRole.entities.DigitalWallet.filter({ user_id: p.user_id });
                if (!wallets || wallets.length === 0) {
                    resultados.push({ payment_id: p.payment_id, acao: 'sem_carteira' });
                    continue;
                }

                await base44.asServiceRole.entities.DigitalWallet.updateMany(
                    { user_id: p.user_id },
                    { $inc: { balance: p.amount } }
                );

                await base44.asServiceRole.entities.DigitalWalletTransaction.create({
                    user_id: p.user_id,
                    type: 'deposit',
                    direction: 'credit',
                    amount: p.amount,
                    related_payment_id: p.payment_id,
                    status: 'confirmed',
                    description: 'Depósito via PIX (Mercado Pago) - creditado pela reconciliação automática'
                });

                await base44.asServiceRole.entities.MercadoPagoPayment.update(p.id, {
                    status: 'confirmed',
                    transaction_id: p.payment_id
                });

                resultados.push({ payment_id: p.payment_id, user_id: p.user_id, amount: p.amount, acao: 'creditado' });
            } catch (e) {
                resultados.push({ payment_id: p.payment_id, acao: 'erro', erro: e.message });
            }
        }

        return Response.json({ success: true, verificados: pendentes.length, resultados });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});