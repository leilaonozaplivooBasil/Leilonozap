// releaseBidHold — libera saldo reservado de lance (saldo_reservado → saldo_disponivel) de forma ATÔMICA.
// Faltava esse endpoint na Vercel (só existia em base44/functions/) — irmão de reserveBidBalance.
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
    const amount = typeof body?.amount === 'number' ? money(body.amount) : null;
    const exceptAmount = typeof body?.except_amount === 'number' ? money(body.except_amount) : null;
    if (!userId) return res.status(400).json({ success: false, error: 'user_id é obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    for (let attempt = 0; attempt < 3; attempt++) {
      const rows = await (await sb(`app_users?select=saldo_disponivel,saldo_reservado&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
      const user = Array.isArray(rows) ? rows[0] : null;
      if (!user) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });

      const saldoAtual = money(user.saldo_disponivel);
      const reservadoAtual = money(user.saldo_reservado);

      let valorLiberar;
      if (amount !== null && amount > 0) {
        valorLiberar = Math.min(amount, reservadoAtual);
      } else if (exceptAmount !== null) {
        valorLiberar = Math.max(0, money(reservadoAtual - exceptAmount));
      } else {
        valorLiberar = reservadoAtual;
      }

      if (valorLiberar <= 0) {
        return res.status(200).json({ success: true, released: 0, released_amount: 0, message: 'Nenhuma reserva pendente para liberar' });
      }

      const novoSaldo = money(saldoAtual + valorLiberar);
      const novoReservado = money(reservadoAtual - valorLiberar);

      const patch = await sb(
        `app_users?id=eq.${encodeURIComponent(userId)}&saldo_reservado=gte.${valorLiberar}`,
        { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ saldo_disponivel: novoSaldo, saldo_reservado: novoReservado }) }
      );
      const updated = await patch.json().catch(() => []);
      const row = Array.isArray(updated) ? updated[0] : null;

      if (row && Math.abs(money(row.saldo_disponivel) - novoSaldo) < 0.01 && Math.abs(money(row.saldo_reservado) - novoReservado) < 0.01) {
        return res.status(200).json({
          success: true,
          released: valorLiberar,
          released_amount: valorLiberar,
          new_balance: row.saldo_disponivel,
          new_held_balance: row.saldo_reservado,
        });
      }
      // corrida: alguém mudou o saldo — tenta de novo
    }
    return res.status(200).json({ success: false, error: 'Não foi possível liberar a reserva — tente novamente' });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}