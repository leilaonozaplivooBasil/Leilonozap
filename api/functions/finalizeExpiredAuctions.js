// finalizeExpiredAuctions — ARREMATE NA HORA, sem depender de ninguém na sala.
//
// Antes, o encerramento só acontecia quando um navegador aberto na sala detectava
// o fim do relógio e chamava finalizeAuction. Leilão vencido sem audiência ficava
// "active" pra sempre (zumbi). Este endpoint roda no cron da Vercel a cada minuto
// (vercel.json) e arremata TODO leilão active/processing com end_time vencido,
// usando a MESMA lógica do finalizeAuction (api/_lib/finalizeAuctionCore.js):
// vencedor pelo maior lance, claim atômico, mensagem de vitória, stats e comissão.
//
// Segurança: endpoint idempotente e gated pelo relógio do servidor — chamá-lo
// fora de hora não encerra nada que ainda não venceu (mesma garantia do
// finalizeAuction, que já é público por design).
import { hasServerEnv, sb, finalizeOneAuction } from '../_lib/finalizeAuctionCore.js';

const BATCH_LIMIT = 25; // leilões por execução — o cron roda de novo em 60s

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!hasServerEnv()) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const nowISO = new Date().toISOString();
    const rows = await (await sb(
      `auctions?select=*&status=in.(active,processing)&end_time=lte.${encodeURIComponent(nowISO)}&order=end_time.asc&limit=${BATCH_LIMIT}`
    )).json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(200).json({ success: true, finalized: 0, results: [] });
    }

    const results = [];
    for (const auction of rows) {
      try {
        const payload = await finalizeOneAuction(auction);
        results.push({
          auction_id: auction.id,
          winner_name: payload?.result?.winner_name || null,
          final_price: payload?.result?.final_price ?? null,
          already_finalized: payload?.result?.already_finalized === true,
        });
      } catch (e) {
        console.error(`[CRON FINALIZE] falha no leilão ${auction.id}:`, e?.message);
        results.push({ auction_id: auction.id, error: String(e?.message || e) });
      }
    }

    const finalized = results.filter(r => !r.error && !r.already_finalized).length;
    console.log(`[CRON FINALIZE] ${finalized}/${rows.length} leilões arrematados às ${nowISO}`);
    return res.status(200).json({ success: true, finalized, results });
  } catch (e) {
    console.error('[CRON FINALIZE] erro fatal:', e);
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
