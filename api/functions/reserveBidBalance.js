// reserveBidBalance — reserva saldo de lance (saldo_disponivel → saldo_reservado) de forma ATÔMICA.
// Faltava esse endpoint na Vercel (só existia em base44/functions/) — por isso o lance era
// aceito na tela mas o saldo nunca era descontado de verdade.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const userId = String(body?.user_id || '').trim();
    const amount = money(body?.amount);
    if (!userId || amount <= 0) return res.status(400).json({ success: false, error: 'Dados inválidos' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    for (let attempt = 0; attempt < 3; attempt++) {
      const rows = await (await sb(`app_users?select=saldo_disponivel,saldo_reservado&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
      const user = Array.isArray(rows) ? rows[0] : null;
      if (!user) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });

      const saldoAtual = money(user.saldo_disponivel);
      const reservadoAtual = money(user.saldo_reservado);

      if (saldoAtual < amount) {
        return res.status(200).json({
          success: false, error: 'Saldo insuficiente',
          balance: saldoAtual, required: amount, deficit: money(amount - saldoAtual),
        });
      }

      const novoSaldo = money(saldoAtual - amount);
      const novoReservado = money(reservadoAtual + amount);

      // CAS: só aplica se saldo_disponivel ainda cobrir o valor no momento da escrita
      const patch = await sb(
        `app_users?id=eq.${encodeURIComponent(userId)}&saldo_disponivel=gte.${amount}`,
        { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ saldo_disponivel: novoSaldo, saldo_reservado: novoReservado }) }
      );
      const updated = await patch.json().catch(() => []);
      const row = Array.isArray(updated) ? updated[0] : null;

      if (row && Math.abs(money(row.saldo_disponivel) - novoSaldo) < 0.01 && Math.abs(money(row.saldo_reservado) - novoReservado) < 0.01) {
        return res.status(200).json({
          success: true,
          balance: row.saldo_disponivel,
          held: row.saldo_reservado,
          new_balance: row.saldo_disponivel,
          new_held_balance: row.saldo_reservado,
        });
      }
      // corrida: alguém mudou o saldo — tenta de novo
    }
    return res.status(200).json({ success: false, error: 'Não foi possível reservar o saldo — tente novamente' });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}