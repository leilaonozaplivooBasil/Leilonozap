// 🔓 Libera saldo reservado de lance direto no Supabase (app_users.saldo_reservado → saldo_disponivel)
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
        const { user_id, amount, except_amount } = await req.json();

        if (!user_id) {
            return Response.json({ success: false, error: 'user_id é obrigatório' }, { status: 400 });
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

            // 2. Calcula valor a liberar (mesma lógica de amount/except_amount)
            //    - amount informado: libera esse valor específico
            //    - except_amount informado: libera tudo que está reservado, exceto esse valor (lance atual)
            //    - nenhum dos dois: libera todo o saldo_reservado do usuário
            let valorLiberar;
            if (typeof amount === 'number' && amount > 0) {
                valorLiberar = Math.min(amount, reservadoAtual);
            } else if (typeof except_amount === 'number') {
                valorLiberar = Math.max(0, reservadoAtual - except_amount);
            } else {
                valorLiberar = reservadoAtual;
            }

            if (valorLiberar <= 0) {
                return Response.json({
                    success: true,
                    released: 0,
                    released_amount: 0,
                    message: 'Nenhuma reserva pendente para liberar'
                });
            }

            const novoSaldo = saldoAtual + valorLiberar;
            const novoReservado = reservadoAtual - valorLiberar;

            // 3. PATCH atômico: só aplica se saldo_reservado ainda cobrir o valor na hora da escrita
            const patchResp = await sbFetch(
                `app_users?id=eq.${user_id}&saldo_reservado=gte.${valorLiberar}`,
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
                console.log(`🔓 [RELEASE] user=${user_id}, liberado=R$ ${valorLiberar.toFixed(2)}, disponivel=R$ ${novoSaldo.toFixed(2)}, reservado=R$ ${novoReservado.toFixed(2)} (tentativa ${attempt})`);

                return Response.json({
                    success: true,
                    released: valorLiberar,
                    released_amount: valorLiberar,
                    new_balance: patchedRow.saldo_disponivel,
                    new_held_balance: patchedRow.saldo_reservado
                });
            }

            console.warn(`⚠️ [RETRY ${attempt}/${MAX_RETRIES}] Liberação não aplicada (condição de corrida). Reavaliando...`);
            if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 200 * attempt));
        }

        console.error('🚨 CRÍTICO: Falha ao liberar reserva após', MAX_RETRIES, 'tentativas. user:', user_id);
        return Response.json({ success: false, error: 'Não foi possível liberar a reserva — tente novamente' }, { status: 409 });

    } catch (error) {
        console.error('Erro releaseBidHold:', error.message);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});