// 📊 RELATÓRIO DE DEPÓSITOS NO WHATSAPP DO AILTON (26/09/2026) — cron da Vercel.
//
// Pedido do dono: "o Zeca envia no WhatsApp individual para o Ailton esse
// relatório de hora em hora — 13:50, 14:50, 15:50… até 17:30".
//
// Travas:
//   • só nos HORARIOS do DIA (api/_lib/relatorioDepositos.js) — fora deles
//     a rota não faz nada, mesmo que alguém a chame;
//   • UMA mensagem por horário (marca em system_logs);
//   • destino vem de RELATORIO_DEPOSITOS_ZAP (número de administrador). Sem a
//     variável NÃO envia — o texto tem nome de cliente e valor. Nunca cai no
//     ALERTA_WHATSAPP geral: o dono pediu só para o Ailton.
import { avisarAdmin } from '../_lib/avisarAdmin.js';
import { DESDE, LEILAO_DESTAQUE, horarioAtual, montarRelatorio } from '../_lib/relatorioDepositos.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enc = encodeURIComponent;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
const lerJson = async (path) => { const r = await sb(path); const j = await r.json().catch(() => []); return Array.isArray(j) ? j : []; };
const lista = (ids) => `in.(${[...new Set(ids)].filter(Boolean).map((x) => `"${x}"`).join(',')})`;

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && (req.headers?.authorization || '') !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'nao_autorizado' });
  }
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!SUPABASE_URL || !SR) return res.status(200).json({ success: false, error: 'config' });
    const destino = String(process.env.RELATORIO_DEPOSITOS_ZAP || '').trim();
    if (!destino) return res.status(200).json({ success: false, error: 'sem_RELATORIO_DEPOSITOS_ZAP' });

    const agora = Date.now();
    const horario = horarioAtual(agora);
    if (!horario) return res.status(200).json({ success: true, enviado: false, motivo: 'fora_do_horario' });

    const passo = `RELATORIO_DEPOSITOS_ZAP_${horario.replace(':', '')}`;
    const ja = await lerJson(`system_logs?select=id&step=eq.${enc(passo)}&created_at=gte.${enc(DESDE)}&limit=1`);
    if (ja.length) return res.status(200).json({ success: true, enviado: false, motivo: 'ja_enviado', horario });

    const depositos = await lerJson(`catalog_sales?select=id,buyer_id,buyer_name,total_amount,status,created_date,updated_at&kind=eq.wallet_deposit&created_date=gte.${enc(DESDE)}&order=created_date.desc&limit=500`);
    const ids = depositos.map((x) => x.buyer_id).filter(Boolean);
    let pagosAntes = [], lances = [], usuarios = {}, nomes = {};
    if (ids.length) {
      pagosAntes = await lerJson(`catalog_sales?select=buyer_id,created_date&kind=eq.wallet_deposit&status=eq.paid&buyer_id=${enc(lista(ids))}&limit=2000`);
      lances = await lerJson(`auction_messages?select=sender_id,created_date&message_type=eq.bid&sender_id=${enc(lista(ids))}&created_date=gte.${enc(DESDE)}&limit=2000`);
      const us = await lerJson(`app_users?select=id,full_name,saldo_disponivel,saldo_reservado,referred_by_id&id=${enc(lista(ids))}`);
      for (const u of us) usuarios[u.id] = u;
      const refs = us.map((u) => u.referred_by_id).filter(Boolean);
      if (refs.length) for (const r of await lerJson(`app_users?select=id,full_name&id=${enc(lista(refs))}`)) nomes[r.id] = r.full_name;
    }
    const [lei] = await lerJson(`auctions?select=id,title,current_price,winner_name,end_time,status&id=eq.${enc(LEILAO_DESTAQUE)}&limit=1`);
    let leilao = null;
    if (lei) {
      const bids = await lerJson(`auction_messages?select=id&auction_id=eq.${enc(lei.id)}&message_type=eq.bid&limit=1000`);
      leilao = { ...lei, lances: bids.length };
    }

    const texto = montarRelatorio({ depositos, pagosAntes, lances, usuarios, nomes, leilao, agora });
    // 🔒 destino só o do pedido — nunca o ALERTA_WHATSAPP geral
    const r = await avisarAdmin(texto, { env: { ...process.env, ALERTA_WHATSAPP: destino } });
    if (r.enviado) {
      await sb('system_logs', { method: 'POST', body: JSON.stringify({ component_name: 'relatorioDepositosZap', step: passo, status: 'info', message: `Relatório de depósitos das ${horario} entregue no WhatsApp (${depositos.length} depósitos).`, created_at: new Date().toISOString() }) }).catch(() => {});
    }
    console.log(`[RELATORIO DEPOSITOS ZAP] ${horario} · depositos ${depositos.length} · enviado ${r.enviado} ${r.motivo || ''}`);
    return res.status(200).json({ success: r.enviado, horario, depositos: depositos.length, motivo: r.motivo });
  } catch (e) {
    console.error('[RELATORIO DEPOSITOS ZAP] erro', e?.message || e);
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
