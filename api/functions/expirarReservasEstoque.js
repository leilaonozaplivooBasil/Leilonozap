// expirarReservasEstoque — PONTO 126 (21/08/2026), Fase 2 do plano de estoque.
//
// Devolve a peça pra venda quando a reserva (criada em api/_lib/estoqueReserva.js, ao
// gerar PIX/checkout) vence sem ninguém pagar. Roda no cron da Vercel a cada minuto
// (vercel.json), mesma cadência do finalizeExpiredAuctions. Sem isso, uma peça
// reservada por alguém que desistiu ficaria "presa" pra sempre — nunca voltando a
// contar como disponível pra outro comprador.
//
// Toda a lógica (o que vence, o que não) mora na RPC — este endpoint só chama e
// devolve o resultado. Idempotente por natureza: rodar de novo só vê `status='ativa'`
// que ainda não tinha sido pego, nunca expira a mesma reserva duas vezes.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const r = await sb('rpc/expirar_reservas_estoque', { method: 'POST', body: JSON.stringify({}) });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.success) {
      return res.status(200).json({ success: false, error: j?.error || `http_${r.status}` });
    }

    return res.status(200).json({ success: true, expiradas: j.expiradas || 0 });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao expirar reservas', details: String(e?.message || e) });
  }
}
