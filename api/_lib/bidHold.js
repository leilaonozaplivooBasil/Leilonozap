// bidHold — devolução de reserva de lance no SERVIDOR.
//
// Por que existe: até aqui a devolução da reserva de quem foi coberto rodava no
// NAVEGADOR de quem dava o lance seguinte, e só liberava a reserva do próprio
// usuário. Resultado: quem era coberto e não voltava a dar lance ficava com o
// dinheiro travado para sempre (e se fechasse a aba, ninguém liberava nunca).
//
// Regra preservada de 26/07: libera SOMENTE o valor daquele leilão específico
// (nunca "tudo"), para não tocar na reserva de outros leilões em que o mesmo
// usuário ainda tenha lance ativo.
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

/**
 * Devolve `amount` de saldo_reservado → saldo_disponivel do usuário.
 * Nunca libera mais do que está reservado. Nunca lança erro (o lance já foi
 * confirmado; falha aqui não pode derrubar a resposta do lance).
 */
export async function releaseHold(userId, amount) {
  const uid = String(userId || '').trim();
  const valor = money(amount);
  if (!uid || valor <= 0 || !SUPABASE_URL || !SR) {
    return { released: 0, reason: 'parametros_invalidos' };
  }

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const rows = await (
        await sb(`app_users?select=saldo_disponivel,saldo_reservado&id=eq.${encodeURIComponent(uid)}&limit=1`)
      ).json();
      const user = Array.isArray(rows) ? rows[0] : null;
      if (!user) return { released: 0, reason: 'usuario_nao_encontrado' };

      const disponivel = money(user.saldo_disponivel);
      const reservado = money(user.saldo_reservado);
      const liberar = money(Math.min(valor, reservado));
      if (liberar <= 0) return { released: 0, reason: 'sem_reserva' };

      // 🔒 CAS de verdade: só escreve se saldo_disponivel E saldo_reservado ainda
      // estiverem EXATAMENTE como foram lidos. Sem o filtro em saldo_disponivel, um
      // depósito que caísse entre a leitura e a escrita seria APAGADO por este PATCH
      // (gravaríamos disponivel_antigo + liberar). Se mudou, o laço tenta de novo.
      const patch = await sb(
        `app_users?id=eq.${encodeURIComponent(uid)}` +
          `&saldo_disponivel=eq.${disponivel}` +
          `&saldo_reservado=eq.${reservado}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            saldo_disponivel: money(disponivel + liberar),
            saldo_reservado: money(reservado - liberar),
          }),
        }
      );
      const updated = await patch.json().catch(() => []);
      const row = Array.isArray(updated) ? updated[0] : null;
      if (row) {
        return {
          released: liberar,
          new_balance: money(row.saldo_disponivel),
          new_held: money(row.saldo_reservado),
        };
      }
      // corrida: alguém mexeu no saldo entre a leitura e a escrita — tenta de novo
    }
    return { released: 0, reason: 'corrida' };
  } catch (e) {
    return { released: 0, reason: String(e?.message || e) };
  }
}