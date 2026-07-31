// 🔎 Auditoria SOMENTE LEITURA — busca os registros de depósito (MercadoPagoPayment)
// no banco INTERNO do Base44 (onde o webhook mercadoPagoWebhook realmente grava),
// já que esses registros não existem no Supabase. Não grava nada.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
async function sbFetch(path: string) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
    });
    return res.json();
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { user_ids, names } = await req.json();

        let ids = user_ids || [];
        if (names && names.length) {
            for (const name of names) {
                const users = await sbFetch(`app_users?full_name=ilike.*${encodeURIComponent(name)}*&select=id,full_name`);
                if (Array.isArray(users)) ids.push(...users.map((u: any) => u.id));
            }
        }

        const results = [];
        for (const uid of ids) {
            const payments = await base44.asServiceRole.entities.MercadoPagoPayment.filter(
                { user_id: uid },
                '-created_date',
                200
            );
            const confirmed = payments.filter((p: any) => p.status === 'confirmed' || p.status === 'received');
            const totalConfirmed = confirmed.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
            results.push({
                user_id: uid,
                total_registros: payments.length,
                confirmados: confirmed.length,
                total_valor_confirmado: Math.round(totalConfirmed * 100) / 100,
                lista_confirmados: confirmed.map((p: any) => `${p.amount}|${p.payment_id}|${(p.created_date||'').slice(0,10)}`)
            });
        }

        return Response.json({ success: true, results });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});