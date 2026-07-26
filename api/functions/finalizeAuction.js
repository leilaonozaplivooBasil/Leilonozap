// finalizeAuction — encerramento REAL do leilão no servidor (service role).
//
// O servidor é a autoridade: só encerra se o relógio DO SERVIDOR confirmar que
// end_time passou; vencedor apurado pelo maior lance gravado; transição atômica.
// A lógica de arremate vive em api/_lib/finalizeAuctionCore.js — compartilhada
// com o cron finalizeExpiredAuctions (arremate na hora mesmo sem ninguém na sala).
//
// Qualquer cliente pode chamar (participante ou espectador): o resultado é
// determinístico e o gate é o tempo real do leilão, não o papel de quem chama.
import {
  GRACE_MS,
  hasServerEnv,
  fetchAuction,
  finalizeOneAuction,
  resultPayload,
} from '../_lib/finalizeAuctionCore.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    if (!hasServerEnv()) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const auctionId = String(body?.auction_id || '').trim();
    if (!auctionId) return res.status(400).json({ success: false, error: 'auction_id é obrigatório' });

    const auction = await fetchAuction(auctionId);
    if (!auction) return res.status(404).json({ success: false, error: 'Leilão não encontrado' });

    // Idempotência: já encerrado → devolve o resultado consolidado, sem refazer efeitos.
    if (auction.status === 'ended' || auction.status === 'sold') {
      return res.status(200).json(resultPayload(auction, { already_finalized: true }));
    }
    if (auction.status !== 'active' && auction.status !== 'processing') {
      return res.status(400).json({ success: false, error: `Leilão não pode ser encerrado (status: ${auction.status})` });
    }

    // ⏱️ GATE REAL: o relógio do SERVIDOR decide, não o do navegador.
    const now = Date.now();
    const endTime = new Date(auction.end_time).getTime();
    if (!Number.isFinite(endTime)) return res.status(400).json({ success: false, error: 'end_time inválido' });
    if (endTime - now > GRACE_MS) {
      return res.status(200).json({
        success: false,
        error: 'Leilão ainda não terminou',
        seconds_remaining: Math.ceil((endTime - now) / 1000),
      });
    }

    const payload = await finalizeOneAuction(auction);
    return res.status(200).json(payload);
  } catch (e) {
    console.error('[FINALIZE] erro fatal:', e);
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
