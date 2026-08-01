// backfillPassaporteCoupons — cria os Cupons Passaporte RETROATIVOS dos depósitos já pagos.
//
// Por que existe: o cupom só passou a nascer no confirm do pagamento em 31/07/2026. Quem
// aportou ANTES não tem cupom. Esta função varre os depósitos já pagos e cria o que falta.
//
// Segurança (🔴 dinheiro):
//  • admin/super_admin apenas (actorId validado em app_users)
//  • dry_run = true por padrão: só relatório, NÃO grava
//  • grava exclusivamente em passaporte_coupons (nunca saldo, comissão ou venda)
//  • idempotente: origin_sale_id é UNIQUE — rodar 2x não duplica
//  • nasce sempre 'bloqueado' (a liberação continua sendo só via superação real no leilão)
import { criarCupomPassaporte, PCT_PASSAPORTE, DEPOSITO_MINIMO } from '../_lib/passaporteCoupon.js';

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const enc = encodeURIComponent;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

    const actorId = String(body?.actorId || '').trim();
    if (!actorId) return res.status(400).json({ success: false, error: 'actorId é obrigatório' });
    const actorArr = await (await sb(`app_users?select=id,role&id=eq.${enc(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    if (!actor || !['admin', 'super_admin'].includes(actor.role)) {
      return res.status(403).json({ success: false, error: 'Sem permissão' });
    }

    const dryRun = body?.dry_run !== false; // padrão: simulação
    const userEmail = String(body?.user_email || '').trim();
    const desde = String(body?.desde || '').trim();

    // Alvo: só um usuário, quando pedido
    let alvoId = null;
    if (userEmail) {
      const u = await (await sb(`app_users?select=id,full_name&email=eq.${enc(userEmail)}&limit=1`)).json();
      const user = Array.isArray(u) ? u[0] : null;
      if (!user) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });
      alvoId = user.id;
    }

    // Depósitos pagos elegíveis (recarga de carteira e Passaporte de Lances)
    let q = `catalog_sales?select=id,buyer_id,buyer_name,buyer_email,total_amount,sale_price,kind,created_at`
      + `&status=eq.paid&kind=in.(wallet_deposit,passaporte)&order=created_at.asc&limit=2000`;
    if (alvoId) q += `&buyer_id=eq.${enc(alvoId)}`;
    if (desde) q += `&created_at=gte.${enc(desde)}`;
    const vendas = await (await sb(q)).json();
    const depositos = (Array.isArray(vendas) ? vendas : [])
      .filter((s) => s.buyer_id && money(s.total_amount || s.sale_price) >= DEPOSITO_MINIMO);

    // Cupons que já existem (não recriar)
    const jaTem = new Set();
    if (depositos.length) {
      const ids = depositos.map((s) => enc(String(s.id))).join(',');
      const existentes = await (await sb(`passaporte_coupons?select=origin_sale_id&origin_sale_id=in.(${ids})`)).json();
      (Array.isArray(existentes) ? existentes : []).forEach((c) => jaTem.add(String(c.origin_sale_id)));
    }

    const pendentes = depositos.filter((s) => !jaTem.has(String(s.id)));
    const detalhe = pendentes.map((s) => {
      const aporte = money(s.total_amount || s.sale_price);
      return {
        sale_id: s.id,
        usuario: s.buyer_name || s.buyer_email || s.buyer_id,
        data: s.created_at,
        aporte,
        credito: money(aporte * PCT_PASSAPORTE / 100),
      };
    });
    const totalCredito = money(detalhe.reduce((a, d) => a + d.credito, 0));

    if (dryRun) {
      return res.status(200).json({
        success: true,
        dry_run: true,
        depositos_elegiveis: depositos.length,
        ja_com_cupom: jaTem.size,
        cupons_a_criar: detalhe.length,
        total_credito: totalCredito,
        detalhe,
      });
    }

    // GRAVAÇÃO — só cria cupons bloqueados, um por depósito
    let criados = 0; const falhas = [];
    for (const s of pendentes) {
      const r = await criarCupomPassaporte(s);
      if (r?.created) criados += 1; else falhas.push({ sale_id: s.id, reason: r?.reason });
    }

    return res.status(200).json({
      success: true,
      dry_run: false,
      depositos_elegiveis: depositos.length,
      cupons_criados: criados,
      total_credito: totalCredito,
      falhas,
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}