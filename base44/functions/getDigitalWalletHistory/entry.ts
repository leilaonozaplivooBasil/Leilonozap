// 🔒 Extrato da Carteira Digital do usuário — mostra SOMENTE o que é dele:
// depósitos reais (PIX confirmado), compras/vendas no catálogo, lances dados
// em leilões e saques solicitados. Comissões de rede NÃO aparecem aqui —
// elas têm extrato próprio (ExtratoComissoes, na página Carteira) e foram
// removidas deste extrato pessoal a pedido do Gabriel (31/07) após o reset
// de comissões de teste, pra não confundir com o saldo/depósito real.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function sbFetch(path: string) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
        },
    });
    return res.json();
}

const DEPOSIT_KINDS = ['wallet_deposit', 'passaporte', 'commission_deposit'];

Deno.serve(async (req) => {
    try {
        const { user_id } = await req.json();
        if (!user_id) {
            return Response.json({ success: false, error: 'Usuário obrigatório', transactions: [] }, { status: 400 });
        }

        const uid = encodeURIComponent(user_id);
        const saleCols = 'id,kind,product_title,sale_price,total_amount,quantity,status,payment_method,tracking_code,created_date,buyer_id,buyer_name';

        const [sales, mySales, wds] = await Promise.all([
            sbFetch(`catalog_sales?select=${saleCols}&buyer_id=eq.${uid}&order=created_date.desc&limit=200`),
            sbFetch(`catalog_sales?select=${saleCols}&seller_id=eq.${uid}&status=eq.paid&kind=not.in.(wallet_deposit,passaporte,commission_deposit)&order=created_date.desc&limit=100`),
            sbFetch(`withdrawal_requests?select=valor,status,requested_at&user_id=eq.${uid}&order=requested_at.desc&limit=50`),
        ]);

        const transactions: any[] = [];

        for (const s of Array.isArray(sales) ? sales : []) {
            const amount = Number(s.total_amount) || Number(s.sale_price) || 0;
            const isDeposit = DEPOSIT_KINDS.includes(s.kind);
            // Depósito cancelado (PIX que nunca foi pago) não é um depósito confirmado — não exibir.
            if (isDeposit && s.status === 'cancelled') continue;
            transactions.push({
                id: s.id,
                type: isDeposit ? 'deposit' : 'purchase',
                title: isDeposit
                    ? (s.kind === 'passaporte' ? 'Passaporte de Lances'
                        : s.kind === 'commission_deposit' ? 'Depósito — Carteira de Comissões'
                        : 'Depósito na Carteira')
                    : (s.product_title || 'Compra'),
                source: isDeposit
                    ? (s.payment_method === 'pix_mp' ? 'PIX' : (s.payment_method || 'Pagamento'))
                    : (s.kind === 'arremate' ? 'Leilão' : 'Loja'),
                amount: isDeposit ? amount : -amount,
                quantity: s.quantity || 1,
                status: s.status === 'paid' ? 'paid' : (s.status === 'pending_payment' ? 'pending' : s.status),
                tracking_code: s.tracking_code || null,
                date: s.created_date,
            });
        }

        for (const s of Array.isArray(mySales) ? mySales : []) {
            if (s.buyer_id === user_id) continue;
            transactions.push({
                id: `sale-${s.id}`,
                type: 'sale',
                title: `Venda — ${s.product_title || 'Produto'}`,
                source: s.buyer_name ? `para ${s.buyer_name}` : (s.kind === 'arremate' ? 'Leilão' : 'Loja'),
                amount: Number(s.total_amount) || Number(s.sale_price) || 0,
                quantity: s.quantity || 1,
                status: 'paid',
                tracking_code: s.tracking_code || null,
                date: s.created_date,
            });
        }

        for (const w of Array.isArray(wds) ? wds : []) {
            transactions.push({
                id: `wd-${w.requested_at}-${w.valor}`,
                type: 'withdrawal',
                title: 'Saque solicitado',
                source: 'Saque',
                amount: -(Number(w.valor) || 0),
                status: w.status || 'pending',
                date: w.requested_at,
            });
        }

        // 🎯 Lances dados em leilões — vivem na entidade interna AuctionMessage
        // (message_type: 'bid'), nunca migrada pro Supabase. Aparecem no extrato
        // como registro informativo (não somam/subtraem do saldo — a reserva/
        // liberação já é tratada por reserveBidBalance/releaseBidHold).
        try {
            const base44 = createClientFromRequest(req);
            const bidMessages = await base44.asServiceRole.entities.AuctionMessage.filter(
                { sender_id: user_id, message_type: 'bid' },
                '-created_date',
                100
            );
            const auctionIds = [...new Set((bidMessages || []).map((m: any) => m.auction_id).filter(Boolean))].slice(0, 60);
            const auctionTitles: Record<string, string> = {};
            await Promise.all(auctionIds.map(async (aid: string) => {
                try {
                    const as = await base44.asServiceRole.entities.Auction.filter({ id: aid });
                    if (as && as[0]) auctionTitles[aid] = as[0].title;
                } catch { /* segue sem o título */ }
            }));
            for (const m of Array.isArray(bidMessages) ? bidMessages : []) {
                transactions.push({
                    id: `bid-${m.id}`,
                    type: 'bid',
                    title: `Lance — ${auctionTitles[m.auction_id] || 'Leilão'}`,
                    source: 'Leilão',
                    amount: Number(m.bid_amount) || 0,
                    status: 'info',
                    date: m.created_date,
                });
            }
        } catch (e) {
            console.warn('Não foi possível carregar histórico de lances:', e.message);
        }

        transactions.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

        return Response.json({ success: true, transactions });

    } catch (error) {
        console.error('Erro getDigitalWalletHistory:', error.message);
        return Response.json({ success: false, error: error.message, transactions: [] });
    }
});