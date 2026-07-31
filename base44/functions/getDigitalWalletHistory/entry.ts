// 🔒 Espelho exato de api/functions/getDigitalWalletHistory.js (Vercel) — a versão antiga
// lia DigitalWalletTransaction (entidade morta do Base44) com um formato de campos
// totalmente diferente do que o WalletDrawer espera, deixando o extrato vazio/errado
// no preview. Agora lê catalog_sales/commission_ledger/commission_records/withdrawal_requests
// direto do Supabase, com o MESMO formato de saída da Vercel.

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

const PAPEL: Record<string, string> = {
    influenciador: 'Influenciador', vendedor: 'Vendedor', licenciado: 'Licenciado',
    parceiro: 'Parceiro', ponto_retirada: 'Ponto de Retirada', loja_fisica: 'Loja Física',
    distribuidor: 'Distribuidor', executivo: 'Sócio Executivo', ceo: 'CEO',
    livoo_live: 'Livoo Live', embaixador: 'Embaixador', conselheiro: 'Conselheiro',
    fundador: 'Fundador', diretoria_executiva: 'Diretoria Executiva',
    diretoria_operacao: 'Diretoria de Operação', empresa_rollup: 'Empresa',
    venda_direta: 'Venda direta', override: 'Rede',
};

Deno.serve(async (req) => {
    try {
        const { user_id } = await req.json();
        if (!user_id) {
            return Response.json({ success: false, error: 'Usuário obrigatório', transactions: [] }, { status: 400 });
        }

        const uid = encodeURIComponent(user_id);
        const saleCols = 'id,kind,product_title,sale_price,total_amount,quantity,status,payment_method,tracking_code,created_date,buyer_id,buyer_name';

        const [sales, mySales, comms, records, wds] = await Promise.all([
            sbFetch(`catalog_sales?select=${saleCols}&buyer_id=eq.${uid}&order=created_date.desc&limit=200`),
            sbFetch(`catalog_sales?select=${saleCols}&seller_id=eq.${uid}&status=eq.paid&kind=not.in.(wallet_deposit,passaporte,commission_deposit)&order=created_date.desc&limit=100`),
            sbFetch(`commission_ledger?select=created_at,role_in_sale,pct,amount,beneficiary_level,sale_id&beneficiary_id=eq.${uid}&order=created_at.desc&limit=100`),
            sbFetch(`commission_records?select=created_date,role,percent,amount,sale_id,product_title,sale_amount,status&user_id=eq.${uid}&order=created_date.desc&limit=200`),
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

        const idsVenda = [...new Set([
            ...(Array.isArray(records) ? records : []).map((r: any) => r.sale_id),
            ...(Array.isArray(comms) ? comms : []).map((c: any) => c.sale_id),
        ].filter(Boolean))].slice(0, 200);
        const vendasDaComissao: Record<string, any> = {};
        if (idsVenda.length) {
            try {
                const inList = idsVenda.map((i: any) => `"${encodeURIComponent(i)}"`).join(',');
                const vr = await sbFetch(`catalog_sales?select=id,product_title,buyer_name,buyer_id,total_amount&id=in.(${inList})`);
                for (const v of Array.isArray(vr) ? vr : []) vendasDaComissao[v.id] = v;
            } catch { /* sem o detalhe, a linha ainda aparece com o que tem */ }
        }
        const nomeDoComprador = (v: any) => (v?.buyer_name || '').trim();

        for (const r of Array.isArray(records) ? records : []) {
            if (r.status === 'canceled') continue; // comissão cancelada (reset/teste) — não exibir no extrato
            const v = vendasDaComissao[r.sale_id];
            const produto = r.product_title || v?.product_title || 'Venda';
            const comprador = nomeDoComprador(v);
            const papel = PAPEL[r.role] || r.role || 'Rede';
            transactions.push({
                id: `rec-${r.sale_id}-${r.role}-${r.amount}`,
                type: 'commission',
                title: `Comissão ${papel}${r.percent ? ` (${r.percent}%)` : ''} — ${produto}`,
                source: comprador ? `compra de ${comprador}` : 'Rede',
                amount: Number(r.amount) || 0,
                status: r.status === 'confirmed' ? 'paid' : (r.status || 'paid'),
                date: r.created_date,
            });
        }

        for (const c of Array.isArray(comms) ? comms : []) {
            if (c.status === 'canceled') continue; // comissão cancelada (reset/teste) — não exibir no extrato
            const v = vendasDaComissao[c.sale_id];
            const produto = v?.product_title || '';
            const comprador = nomeDoComprador(v);
            const papel = PAPEL[c.role_in_sale] || c.role_in_sale || 'Rede';
            transactions.push({
                id: `comm-${c.created_at}-${c.amount}`,
                type: 'commission',
                title: `Comissão ${papel}${c.pct ? ` (${c.pct}%)` : ''}${produto ? ` — ${produto}` : ''}`,
                source: comprador ? `compra de ${comprador}` : 'Rede',
                amount: Number(c.amount) || 0,
                status: c.status || 'paid',
                date: c.created_at,
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

        transactions.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

        return Response.json({ success: true, transactions });

    } catch (error) {
        console.error('Erro getDigitalWalletHistory:', error.message);
        return Response.json({ success: false, error: error.message, transactions: [] });
    }
});