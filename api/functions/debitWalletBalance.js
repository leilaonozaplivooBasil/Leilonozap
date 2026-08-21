// debitWalletBalance — debita saldo gastável (app_users.saldo_disponivel) de forma ATÔMICA (compare-and-swap).
// Usado pelo arremate/compra rápida na sala do leilão. Só debita se houver saldo suficiente.
import { compromissoEmLeiloes } from '../_lib/compromissoLeilao.js';
import { exigirSessao } from '../_lib/sessao.js';

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
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, userId, 'debitWalletBalance');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    const amount = money(body?.amount);
    if (!userId || amount <= 0) return res.status(400).json({ success: false, error: 'Dados inválidos' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // 🔒 COMPRA NA LOJA VIRTUAL — REGRA DOS TRÊS ESTADOS (08/08/2026).
    // Quem chama com escopo 'loja' só pode gastar o dinheiro LIVRE: o que está
    // comprometido em leilão ainda rolando serve para relançar, não para comprar.
    // O arremate/compra na sala do leilão NÃO manda escopo e segue como sempre —
    // ali o dinheiro do leilão é justamente o que deve ser usado.
    if (String(body?.escopo || '') === 'loja') {
      const comprometido = await compromissoEmLeiloes(userId);
      if (comprometido > 0) {
        const rows = await (await sb(`app_users?select=saldo_disponivel&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
        const disponivel = money(Array.isArray(rows) ? rows[0]?.saldo_disponivel : 0);
        const livre = money(Math.max(0, disponivel - comprometido));
        if (amount > livre) {
          return res.status(200).json({
            success: false,
            error: `Você tem ${money(comprometido).toFixed(2).replace('.', ',')} em disputa em leilões que ainda não encerraram. Esse valor libera para a loja quando cada leilão terminar.`,
            balance: disponivel,
            saldo_livre_loja: livre,
            saldo_comprometido_leilao: comprometido,
          });
        }
      }
    }

    // compare-and-swap: lê saldo, tenta gravar novo valor GUARDANDO o valor antigo.
    // Se outra operação alterou o saldo no meio, 0 linhas voltam e a gente relê e tenta de novo.
    for (let attempt = 0; attempt < 5; attempt++) {
      const rows = await (await sb(`app_users?select=saldo_disponivel&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
      const user = Array.isArray(rows) ? rows[0] : null;
      if (!user) return res.status(200).json({ success: false, error: 'Usuário não encontrado', balance: 0 });
      const current = money(user.saldo_disponivel);
      if (current < amount) {
        return res.status(200).json({ success: false, error: 'Saldo insuficiente', balance: current });
      }
      const novo = money(current - amount);
      // guarda pelo valor exato atual (CAS). eq. em numeric casa o valor exato.
      const patch = await sb(
        `app_users?id=eq.${encodeURIComponent(userId)}&saldo_disponivel=eq.${current}`,
        { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ saldo_disponivel: novo }) }
      );
      const updated = await patch.json().catch(() => []);
      if (Array.isArray(updated) && updated.length) {
        return res.status(200).json({ success: true, new_balance: novo, balance: novo, debited: amount });
      }
      // corrida: alguém mudou o saldo — tenta de novo
    }
    return res.status(200).json({ success: false, error: 'Concorrência ao debitar, tente novamente' });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}