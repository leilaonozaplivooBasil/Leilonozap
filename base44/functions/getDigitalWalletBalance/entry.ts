// 🔒 Lê o saldo direto do Supabase (app_users.saldo_disponivel/saldo_alocado) via REST + service_role.
// Espelha api/functions/getDigitalWalletBalance.js (Vercel) — mesma fonte nos dois ambientes.
// NUNCA usar base44.asServiceRole.entities.DigitalWallet aqui (entidade antiga/morta do Base44,
// desconectada do saldo real que o app usa em produção).

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
            return Response.json({ error: 'user_id obrigatório' }, { status: 400 });
        }

        const rows = await sbFetch(`app_users?select=saldo_disponivel,saldo_alocado&id=eq.${encodeURIComponent(user_id)}&limit=1`);
        const user = Array.isArray(rows) ? rows[0] : null;

        const balance = Number(user?.saldo_disponivel) || 0;
        const held_balance = Number(user?.saldo_alocado) || 0;

        return Response.json({
            success: true,
            balance,
            held_balance,
            total_balance: balance + held_balance,
        });

    } catch (error) {
        console.error('Erro getDigitalWalletBalance:', error.message);
        return Response.json({ error: error.message, balance: 0 }, { status: 500 });
    }
});