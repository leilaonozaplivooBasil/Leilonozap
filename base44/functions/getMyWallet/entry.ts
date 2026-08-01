// 🔒 Espelho exato de api/functions/getMyWallet.js (Vercel) — não existia do lado Base44,
// por isso a "Minha Carteira" aparecia zerada no preview (WalletDrawer chamava uma função
// que só existia na Vercel). Lê tudo direto do Supabase via service_role.

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

Deno.serve(async (req) => {
    try {
        const { user_id } = await req.json();
        if (!user_id) {
            return Response.json({ success: false, error: 'Usuário obrigatório' }, { status: 400 });
        }

        const users = await sbFetch(`app_users?select=saldo_disponivel,saldo_alocado,saldo_reservado,commission_balance,kyc_status,cpf,full_name&id=eq.${encodeURIComponent(user_id)}&limit=1`);
        const user = Array.isArray(users) ? users[0] : null;
        if (!user) return Response.json({ success: false, error: 'Usuário não encontrado' });

        let commissions = await sbFetch(`commission_ledger?select=created_at,role_in_sale,pct,amount,beneficiary_level,status,release_at&beneficiary_id=eq.${encodeURIComponent(user_id)}&order=created_at.desc&limit=100`);
        if (!Array.isArray(commissions)) {
            commissions = await sbFetch(`commission_ledger?select=created_at,role_in_sale,pct,amount,beneficiary_level&beneficiary_id=eq.${encodeURIComponent(user_id)}&order=created_at.desc&limit=100`);
        }

        let saldo_a_liberar = 0;
        try {
            const holds = await sbFetch(`commission_ledger?select=amount&beneficiary_id=eq.${encodeURIComponent(user_id)}&status=eq.a_liberar`);
            if (Array.isArray(holds)) saldo_a_liberar = holds.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
        } catch { /* coluna status ainda não existe → 0 */ }
        saldo_a_liberar = Math.round(saldo_a_liberar * 100) / 100;

        const withdrawals = await sbFetch(`withdrawal_requests?select=valor,status,requested_at,reviewed_at,reject_reason&user_id=eq.${encodeURIComponent(user_id)}&order=requested_at.desc&limit=50`);
        const kycRows = await sbFetch(`kyc_data?select=submitted_at,reviewed_at,reject_reason&user_id=eq.${encodeURIComponent(user_id)}&limit=1`);
        const kyc = Array.isArray(kycRows) ? kycRows[0] || null : null;

        return Response.json({
            success: true,
            saldo_disponivel: Number(user.saldo_disponivel) || 0,
            saldo_alocado: Number(user.saldo_alocado) || 0,
            // 💰 travado em lances ativos (coluna usada por reserveBidBalance/releaseHold). Campo ADITIVO.
            saldo_reservado: Number(user.saldo_reservado) || 0,
            saldo_a_liberar,
            commission_balance: Number(user.commission_balance) || 0,
            kyc_status: user.kyc_status || 'nao_iniciado',
            cpf: user.cpf || null,
            commissions: Array.isArray(commissions) ? commissions : [],
            withdrawals: Array.isArray(withdrawals) ? withdrawals : [],
            kyc,
        });

    } catch (error) {
        console.error('Erro getMyWallet:', error.message);
        return Response.json({ success: false, error: error.message });
    }
});