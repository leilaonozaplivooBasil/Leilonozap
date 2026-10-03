// 📈 painelInvestidor — os números da Visão Geral para investidor, calculados no
// banco por UMA regra só (public.painel_investidor, migração 20260930160000).
// Só admin/super_admin. Conciliado com o Mercado Pago em 30/09/2026 (DIR-190).
import { exigirSessao } from '../_lib/sessao.js';
const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const userId = String(body?.user_id || '').trim();
    const dias = Math.max(0, Math.min(3650, parseInt(body?.dias, 10) || 0));
    const _ses = exigirSessao(req, userId, 'painelInvestidor');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    if (!userId) return res.status(400).json({ success: false, error: 'user_id obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const ator = (await (await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(userId)}&limit=1`)).json())[0];
    if (!ator || !['admin', 'super_admin'].includes(ator.role)) return res.status(403).json({ success: false, error: 'Acesso restrito a administradores' });

    const [r, rp, rc] = await Promise.all([
      sb('rpc/painel_investidor', { method: 'POST', body: JSON.stringify({ _dias: dias }) }),
      sb('rpc/painel_investidor_perfil', { method: 'POST', body: JSON.stringify({ _dias: dias }) }),
      // 🏦 DIR-195 — conciliação com o Mercado Pago (o que bate, o que não bate, quem ligar)
      sb('rpc/painel_conciliacao', { method: 'POST', body: '{}' }),
    ]);
    if (!r.ok) return res.status(200).json({ success: false, error: 'Falha ao calcular', detail: (await r.text()).slice(0, 200) });
    const painel = await r.json();
    // 👥 perfil (sexo estimado pelo nome, canais de origem) — best-effort: se falhar, o resto da tela vive
    painel.perfil = rp.ok ? await rp.json().catch(() => null) : null;
    painel.conciliacao = rc.ok ? await rc.json().catch(() => null) : null;
    return res.status(200).json({ success: true, painel });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e).slice(0, 200) });
  }
}
