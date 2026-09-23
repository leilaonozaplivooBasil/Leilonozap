// ⏰ "Última hora" — cron a cada 15 min: quem deu lance num leilão que encerra
// em ~1h recebe um aviso (1x por pessoa por leilão; regras em regrasDosAvisos.js).
import { enviarAviso } from '../_lib/avisosPorEmail.js';
import { janelaUltimaHora } from '../_lib/regrasDosAvisos.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
function sb(path) { return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SR, Authorization: `Bearer ${SR}` } }); }

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { de, ate } = janelaUltimaHora();
    const leiloes = await (await sb(`auctions?select=id,title,current_price,end_time,winner_id&status=eq.active&end_time=gte.${de}&end_time=lte.${ate}&or=(modo_chamada.is.null,modo_chamada.eq.false)&or=(is_test_auction.is.null,is_test_auction.eq.false)&limit=200`)).json();
    let enviados = 0; let pessoas = 0;
    for (const a of (Array.isArray(leiloes) ? leiloes : [])) {
      const lances = await (await sb(`auction_messages?select=sender_id&auction_id=eq.${encodeURIComponent(a.id)}&message_type=eq.bid&limit=2000`)).json();
      const ids = [...new Set((Array.isArray(lances) ? lances : []).map((l) => l.sender_id).filter(Boolean))];
      for (const uid of ids) {
        pessoas += 1;
        const r = await enviarAviso({ tipo: 'ultima_hora', userId: uid, chave: a.id, dados: { produto: a.title, valorAtual: a.current_price, termina: a.end_time, leilaoId: a.id, naFrente: a.winner_id === uid } });
        if (r.enviado) enviados += 1;
      }
    }
    return res.status(200).json({ success: true, leiloes: Array.isArray(leiloes) ? leiloes.length : 0, pessoas, enviados });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
