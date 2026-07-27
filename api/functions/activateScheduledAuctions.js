// activateScheduledAuctions — ativa leilões AGENDADOS cujo horário de início chegou.
// Enquanto status='scheduled', end_time guarda o INÍCIO programado e raw_base44.schedule_meta
// guarda { start_at, duration_min }. Ao ativar: status='active' e end_time = agora + duração.
// Chamada fire-and-forget pela Home a cada visita (não precisa de cron pago).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Supabase env ausente' });

    const nowISO = new Date().toISOString();
    const r = await sb(`auctions?status=eq.scheduled&end_time=lte.${encodeURIComponent(nowISO)}&select=id,end_time,raw_base44`);
    const rows = await r.json().catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(200).json({ success: true, activated: 0 });
    }

    let activated = 0;
    for (const a of rows) {
      const durMin = Number(a?.raw_base44?.schedule_meta?.duration_min) || 720;
      const newEnd = new Date(Date.now() + durMin * 60000).toISOString();
      const raw = a.raw_base44 && typeof a.raw_base44 === 'object' ? { ...a.raw_base44 } : {};
      delete raw.schedule_meta;
      const u = await sb(`auctions?id=eq.${encodeURIComponent(a.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active', end_time: newEnd, winner_id: null, winner_name: null, raw_base44: raw }),
      });
      if (u.ok) activated++;
    }
    return res.status(200).json({ success: true, activated });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
