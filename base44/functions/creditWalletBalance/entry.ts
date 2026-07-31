// 🔒 Credita saldo direto no Supabase (app_users.saldo_disponivel) via REST + service_role.
// NUNCA usar base44.asServiceRole.entities.* aqui (aponta pro store interno do Base44,
// não pro Supabase real que a produção lê — causava saldo "creditado" mas invisível no app).

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function sbFetch(path: string, method = 'GET', body?: object) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method,
        headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation'
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { ok: res.ok, status: res.status, data: json };
}

Deno.serve(async (req) => {
    try {
        const { user_id, amount, description } = await req.json();

        if (!user_id || !amount || amount <= 0) {
            return Response.json({ error: 'user_id e amount (>0) são obrigatórios' }, { status: 400 });
        }

        const MAX_RETRIES = 3;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            const getResp = await sbFetch(`app_users?id=eq.${user_id}&select=id,saldo_disponivel`);
            const user = Array.isArray(getResp.data) ? getResp.data[0] : null;

            if (!getResp.ok || !user) {
                return Response.json({ success: false, error: 'Usuário não encontrado', balance: 0 }, { status: 400 });
            }

            const previousBalance = Number(user.saldo_disponivel) || 0;
            const newBalance = Math.round((previousBalance + amount) * 100) / 100;

            // PATCH atômico: só aplica se saldo_disponivel ainda for o mesmo lido agora (CAS)
            const patchResp = await sbFetch(
                `app_users?id=eq.${user_id}&saldo_disponivel=eq.${previousBalance}`,
                'PATCH',
                { saldo_disponivel: newBalance }
            );
            const patchedRow = Array.isArray(patchResp.data) ? patchResp.data[0] : null;

            if (patchResp.ok && patchedRow) {
                console.log(`✅ [CREDIT] user=${user_id}, valor=R$ ${amount.toFixed(2)}, saldo anterior=R$ ${previousBalance.toFixed(2)}, novo saldo=R$ ${newBalance.toFixed(2)} (${description || ''})`);
                return Response.json({
                    success: true,
                    previous_balance: previousBalance,
                    credited: amount,
                    new_balance: patchedRow.saldo_disponivel
                });
            }

            console.warn(`⚠️ [RETRY ${attempt}/${MAX_RETRIES}] Crédito não aplicado (saldo mudou/condição de corrida). Reavaliando...`);
            if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 200 * attempt));
        }

        console.error('🚨 CRÍTICO: Falha ao creditar saldo após', MAX_RETRIES, 'tentativas. user:', user_id, 'valor:', amount);
        return Response.json({ success: false, error: 'Não foi possível creditar o saldo — tente novamente' }, { status: 409 });

    } catch (error) {
        console.error('Erro creditWalletBalance:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});