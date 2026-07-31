// 🔒 Debita saldo direto no Supabase (app_users.saldo_disponivel) via REST + service_role,
// com compare-and-swap (CAS) para evitar corrida entre débitos concorrentes.
// Espelha api/functions/debitWalletBalance.js (Vercel) — mesma fonte nos dois ambientes.
// NUNCA usar base44.asServiceRole.entities.DigitalWallet aqui (entidade antiga/morta do Base44,
// desconectada do saldo real que o app usa em produção — causava "saldo insuficiente" falso
// no arremate rápido mesmo com saldo real disponível).

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function sbFetch(path: string, method = 'GET', body?: object) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method,
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { ok: res.ok, status: res.status, data: json };
}

const money = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

Deno.serve(async (req) => {
    try {
        const { user_id, amount, auction_id, description } = await req.json();

        if (!user_id || !amount || amount <= 0) {
            return Response.json({ error: 'user_id e amount (>0) são obrigatórios' }, { status: 400 });
        }

        const amt = money(amount);
        const MAX_RETRIES = 5;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            const getResp = await sbFetch(`app_users?id=eq.${user_id}&select=id,saldo_disponivel`);
            const user = Array.isArray(getResp.data) ? getResp.data[0] : null;

            if (!getResp.ok || !user) {
                return Response.json({ success: false, error: 'Usuário não encontrado', balance: 0 }, { status: 400 });
            }

            const current = money(user.saldo_disponivel);
            if (current < amt) {
                return Response.json({ success: false, error: 'Saldo insuficiente', balance: current }, { status: 400 });
            }

            const novo = money(current - amt);
            // CAS: só aplica se saldo_disponivel ainda for exatamente o valor lido agora
            const patchResp = await sbFetch(
                `app_users?id=eq.${user_id}&saldo_disponivel=eq.${current}`,
                'PATCH',
                { saldo_disponivel: novo }
            );
            const patchedRow = Array.isArray(patchResp.data) ? patchResp.data[0] : null;

            if (patchResp.ok && patchedRow) {
                console.log(`✅ [DEBIT] user=${user_id}, valor=R$ ${amt.toFixed(2)}, saldo anterior=R$ ${current.toFixed(2)}, novo saldo=R$ ${patchedRow.saldo_disponivel} (${description || ''}, auction=${auction_id || 'n/a'})`);
                return Response.json({
                    success: true,
                    previous_balance: current,
                    debited: amt,
                    new_balance: patchedRow.saldo_disponivel,
                    balance: patchedRow.saldo_disponivel,
                });
            }
            console.warn(`⚠️ [RETRY ${attempt}/${MAX_RETRIES}] Débito não aplicado (saldo mudou/condição de corrida). Reavaliando...`);
        }

        return Response.json({ success: false, error: 'Concorrência ao debitar, tente novamente' }, { status: 409 });

    } catch (error) {
        console.error('Erro debitWalletBalance:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});