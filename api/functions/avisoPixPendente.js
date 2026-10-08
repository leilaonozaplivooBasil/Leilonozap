// ⏳ "PIX pendente" — cron a cada 15 min (28/09/2026, pedido do dono: "PIX gerado
// e não pago, lembrete ~1h depois"). Quem gerou um PIX (depósito na Carteira ou
// pedido da Loja) entre 60 e 75 min atrás e não pagou recebe UM e-mail.
//
// Travas:
//   • só PIX do Mercado Pago ainda em 'pending_payment';
//   • não lembra de PIX velho se a pessoa gerou outro depois (pixMereceLembrete);
//   • 1x por venda (avisos_enviados, chave = id da venda) e as preferências da
//     pessoa (avisos_conta) — tudo dentro do enviarAviso;
//   • é só e-mail: NUNCA vira notificação na tela (decisão do dono).
import { enviarAviso } from '../_lib/avisosPorEmail.js';
import { janelaPixPendente, pixMereceLembrete, numeroDoPedido } from '../_lib/regrasDosAvisos.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
function sb(path) { return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SR, Authorization: `Bearer ${SR}` } }); }

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && (req.headers?.authorization || '') !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'nao_autorizado' });
  }
  res.setHeader('Content-Type', 'application/json');
  try {
    const { de, ate } = janelaPixPendente();
    // 🛡️ DIR-211: depósito PAGO que o antifraude segurou continua 'pending_payment' — não é PIX
    // pendente, e não pode receber "você ainda não pagou" (antifraude_espera_ate=is.null).
    const vendas = await (await sb(`catalog_sales?select=id,kind,buyer_id,total_amount,tracking_code,created_date,pix_ticket_url&status=eq.pending_payment&payment_method=eq.pix_mp&kind=in.(wallet_deposit,loja)&antifraude_espera_ate=is.null&created_date=gte.${de}&created_date=lt.${ate}&limit=200`)).json();
    let enviados = 0; let pulados = 0;
    for (const v of (Array.isArray(vendas) ? vendas : [])) {
      if (!v.buyer_id) { pulados += 1; continue; }
      const outras = await (await sb(`catalog_sales?select=id,created_date&buyer_id=eq.${encodeURIComponent(v.buyer_id)}&kind=eq.${v.kind}&created_date=gt.${encodeURIComponent(v.created_date)}&limit=5`)).json();
      if (!pixMereceLembrete(v, Array.isArray(outras) ? outras : [])) { pulados += 1; continue; }
      const link = String(v.pix_ticket_url || '');  // a página do Mercado Pago com o QR e o copia e cola
      const r = await enviarAviso({
        tipo: 'pix_pendente', userId: v.buyer_id, chave: v.id,
        dados: { deposito: v.kind === 'wallet_deposit', valor: v.total_amount, pedido: numeroDoPedido(v), link: /^https:\/\//.test(link) ? link : '' },
      });
      if (r.enviado) enviados += 1; else pulados += 1;
    }
    return res.status(200).json({ success: true, vendas: Array.isArray(vendas) ? vendas.length : 0, enviados, pulados });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
