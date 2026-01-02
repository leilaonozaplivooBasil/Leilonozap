import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { duration = 3 } = await req.json();

        const now = new Date();
        const endTime = new Date(now.getTime() + duration * 60000);

        console.log(`🧪 [CREATE TEST] Criando leilão de teste - ${duration} minutos`);
        console.log(`🧪 [CREATE TEST] End Time (UTC): ${endTime.toISOString()}`);

        const testAuction = await base44.asServiceRole.entities.Auction.create({
            title: `[TESTE] Fritadeira Air Fryer - ${duration}min`,
            description: `Leilão de teste criado automaticamente. Duração: ${duration} minutos.`,
            starting_price: 50,
            current_price: 50,
            increment: 5,
            end_time: endTime.toISOString(),
            category: "eletrodomesticos",
            status: "active",
            image_urls: ["https://images.unsplash.com/photo-1585515320310-259814ba6348?w=400"],
            product_source: "return_resale",
            seller_id: user.id,
            seller_name: "Sistema de Testes",
            is_test_auction: true // 🆕 MARCAR COMO TESTE
        });

        console.log(`✅ [CREATE TEST] Leilão ${testAuction.id} criado como TESTE!`);

        return Response.json({ 
            success: true, 
            auction_id: testAuction.id,
            end_time: endTime.toISOString(),
            duration_minutes: duration,
            is_test: true
        });

    } catch (error) {
        console.error("❌ [CREATE TEST] Erro:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});