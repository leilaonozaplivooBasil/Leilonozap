// 🔎 Auditoria SOMENTE LEITURA de saldo real (Supabase REST direto, service_role) para
// contas específicas. NÃO grava nada — só calcula e retorna a comparação.
// saldo_real = depósitos confirmados + comissões pagas - compras pagas - holds de lance órfãos

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
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { ok: res.ok, status: res.status, data: json };
}

const money = (n: any) => Math.round((Number(n) || 0) * 100) / 100;

Deno.serve(async (req) => {
    try {
        const { names } = await req.json();
        const searchNames: string[] = Array.isArray(names) && names.length
            ? names
            : ['Luiz Santanna', 'Luciano Pinheiro', 'Beatriz', 'Diana', 'Cristiano Ribeiro', 'Elenice', 'Yara'];

        const results = [];

        for (const name of searchNames) {
            const usersResp = await sbFetch(`app_users?full_name=ilike.*${encodeURIComponent(name)}*&select=id,full_name,email,saldo_disponivel,saldo_reservado`);
            const users = Array.isArray(usersResp.data) ? usersResp.data : [];

            if (!users.length) {
                results.push({ name, found: false });
                continue;
            }

            for (const user of users) {
                const uid = user.id;

                const [deposResp, salesResp, commResp, walletTxResp, allDeposResp, depositTxResp] = await Promise.all([
                    sbFetch(`asaas_payments?wallet_deposit_user_id=eq.${uid}&status=in.(confirmed,received)&select=id,value,status,payment_date,created_date`),
                    sbFetch(`catalog_sales?buyer_id=eq.${uid}&status=eq.paid&select=id,total_amount,status,payment_confirmed_date`),
                    sbFetch(`commission_records?user_id=eq.${uid}&status=in.(confirmed,paid)&select=id,amount,role,status,sale_id`),
                    sbFetch(`digital_wallet_transactions?user_id=eq.${uid}&type=in.(bid_hold,bid_release)&select=id,type,direction,amount,status,related_auction_id,created_date&order=created_date.asc`),
                    sbFetch(`asaas_payments?wallet_deposit_user_id=eq.${uid}&select=id,value,status,payment_date,created_date,payment_id,external_reference&order=created_date.asc`),
                    sbFetch(`digital_wallet_transactions?user_id=eq.${uid}&type=eq.deposit&select=id,amount,status,description,created_date&order=created_date.asc`),
                ]);

                const deposits = Array.isArray(deposResp.data) ? deposResp.data : [];
                const sales = Array.isArray(salesResp.data) ? salesResp.data : [];
                const commissions = Array.isArray(commResp.data) ? commResp.data : [];
                const walletTx = Array.isArray(walletTxResp.data) ? walletTxResp.data : [];

                const totalDeposits = money(deposits.reduce((s, d) => s + (Number(d.value) || 0), 0));
                const totalPurchases = money(sales.reduce((s, sVal) => s + (Number(sVal.total_amount) || 0), 0));
                const totalCommissions = money(commissions.reduce((s, c) => s + (Number(c.amount) || 0), 0));

                // Holds órfãos: agrupa por leilão (related_auction_id). Para cada leilão, soma holds
                // menos releases; o que restar positivo é hold nunca liberado (bug antigo).
                const byAuction: Record<string, number> = {};
                for (const tx of walletTx) {
                    const key = tx.related_auction_id || 'sem_leilao';
                    const amt = Number(tx.amount) || 0;
                    byAuction[key] = (byAuction[key] || 0) + (tx.type === 'bid_hold' ? amt : -amt);
                }
                const orphanHolds = money(Object.values(byAuction).reduce((s, v) => s + Math.max(0, v), 0));

                const saldoCalculado = money(totalDeposits + totalCommissions - totalPurchases - orphanHolds);

                results.push({
                    name,
                    found: true,
                    user_id: uid,
                    full_name: user.full_name,
                    email: user.email,
                    saldo_atual_banco: money(user.saldo_disponivel),
                    saldo_reservado_atual: money(user.saldo_reservado),
                    total_depositos_confirmados: totalDeposits,
                    total_comissoes_pagas: totalCommissions,
                    total_compras_pagas: totalPurchases,
                    total_holds_orfaos: orphanHolds,
                    saldo_calculado: saldoCalculado,
                    diferenca: money(saldoCalculado - money(user.saldo_disponivel)),
                    n_depositos: deposits.length,
                    n_compras: sales.length,
                    n_comissoes: commissions.length,
                    n_lances: walletTx.length,
                    todos_depositos_asaas_payments: Array.isArray(allDeposResp.data) ? allDeposResp.data : [],
                    log_deposit_wallet_tx: Array.isArray(depositTxResp.data) ? depositTxResp.data : [],
                });
            }
        }

        return Response.json({ success: true, results });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});