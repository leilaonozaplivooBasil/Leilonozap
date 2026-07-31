// 🔒 Reserva saldo de lance direto no Supabase (app_users.saldo_disponivel → saldo_reservado)
// via REST + service_role. NUNCA usar base44.asServiceRole.entities.* aqui (não aponta pro Supabase real).

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
        const { user_id, amount } = await req.json();

        if (!user_id || !amount || amount <= 0) {
            return Response.json({
                success: false,
                error: 'user_id e amount (>0) são obrigatórios'
            }, { status: 400 });
        }

        const MAX_RETRIES = 3;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            // 1. Lê saldo atual
            const getResp = await sbFetch(`app_users?id=eq.${user_id}&select=id,saldo_disponivel,saldo_reservado`);
            const user = Array.isArray(getResp.data) ? getResp.data[0] : null;

            if (!getResp.ok || !user) {
                return Response.json({ success: false, error: 'Usuário não encontrado' }, { status: 400 });
            }

            const saldoAtual = Number(user.saldo_disponivel) || 0;
            const reservadoAtual = Number(user.saldo_reservado) || 0;

            // 2. Verifica saldo suficiente
            if (saldoAtual < amount) {
                return Response.json({
                    success: false,
                    error: 'Saldo insuficiente',
                    balance: saldoAtual,
                    required: amount,
                    deficit: amount - saldoAtual
                }, { status: 400 });
            }

            const novoSaldo = saldoAtual - amount;
            const novoReservado = reservadoAtual + amount;

            // 3. PATCH atômico: só aplica se saldo_disponivel ainda cobrir o valor na hora da escrita
            //    (evita race condition — equivalente ao antigo updateMany com $gte)
            const patchResp = await sbFetch(
                `app_users?id=eq.${user_id}&saldo_disponivel=gte.${amount}`,
                'PATCH',
                { saldo_disponivel: novoSaldo, saldo_reservado: novoReservado }
            );
            const patchedRow = Array.isArray(patchResp.data) ? patchResp.data[0] : null;

            // 4. Verifica que os valores batem
            if (
                patchResp.ok && patchedRow &&
                Math.abs((patchedRow.saldo_disponivel || 0) - novoSaldo) < 0.01 &&
                Math.abs((patchedRow.saldo_reservado || 0) - novoReservado) < 0.01
            ) {
                console.log(`🔒 [RESERVE] user=${user_id}, valor=R$ ${amount.toFixed(2)}, disponivel=R$ ${novoSaldo.toFixed(2)}, reservado=R$ ${novoReservado.toFixed(2)} (tentativa ${attempt})`);

                return Response.json({
                    success: true,
                    balance: patchedRow.saldo_disponivel,
                    held: patchedRow.saldo_reservado,
                    new_balance: patchedRow.saldo_disponivel,
                    new_held_balance: patchedRow.saldo_reservado
                });
            }

            console.warn(`⚠️ [RETRY ${attempt}/${MAX_RETRIES}] Reserva não aplicada (saldo mudou/condição de corrida). Reavaliando...`);
            if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 200 * attempt));
        }

        console.error('🚨 CRÍTICO: Falha ao reservar saldo após', MAX_RETRIES, 'tentativas. user:', user_id, 'valor:', amount);
        return Response.json({ success: false, error: 'Não foi possível reservar o saldo — tente novamente' }, { status: 409 });

    } catch (error) {
        console.error('Erro reserveBidBalance:', error.message);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});