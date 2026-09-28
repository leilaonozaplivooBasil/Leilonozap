// 🔔 O SINO DO CLIENTE — 28/09/2026. Lista e marca como lidas as notificações
// de QUEM ESTÁ LOGADO. O id vem do CRACHÁ (conferirSessao), nunca do corpo:
// ninguém lê o sino de outra pessoa mandando outro user_id.
//
//   POST { acao: 'listar' }                 → { itens, naoLidas }
//   POST { acao: 'lidas', ids: [1,2] }      → marca estas
//   POST { acao: 'lidas', todas: true }     → marca todas
import { conferirSessao } from '../_lib/sessao.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
/** O sino mostra as últimas 30 dos últimos 30 dias — é aviso, não extrato. */
export const LIMITE = 30;
export const DIAS = 30;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  const sessao = conferirSessao(req);
  if (!sessao.ok) return res.status(401).json({ success: false, error: 'nao_autenticado' });
  if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'config' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const uid = encodeURIComponent(sessao.userId);

    if (body?.acao === 'lidas') {
      const ids = (Array.isArray(body.ids) ? body.ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 100);
      if (!body.todas && !ids.length) return res.status(200).json({ success: true, marcadas: 0 });
      const filtro = body.todas ? '' : `&id=in.(${ids.join(',')})`;
      const r = await sb(`notificacoes?user_id=eq.${uid}&lida_em=is.null${filtro}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ lida_em: new Date().toISOString() }),
      });
      return res.status(200).json({ success: r.ok });
    }

    const desde = new Date(Date.now() - DIAS * 86400000).toISOString();
    const [lista, contagem] = await Promise.all([
      sb(`notificacoes?select=id,tipo,titulo,texto,link,criada_em,lida_em&user_id=eq.${uid}&criada_em=gte.${desde}&order=criada_em.desc&limit=${LIMITE}`),
      sb(`notificacoes?select=id&user_id=eq.${uid}&lida_em=is.null&criada_em=gte.${desde}&limit=1`, { headers: { Prefer: 'count=exact' } }),
    ]);
    const itens = await lista.json().catch(() => []);
    const total = Number(String(contagem.headers.get('content-range') || '').split('/')[1]);
    return res.status(200).json({ success: true, itens: Array.isArray(itens) ? itens : [], naoLidas: Number.isFinite(total) ? total : 0 });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
