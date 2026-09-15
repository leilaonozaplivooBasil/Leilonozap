// liveHeartbeat — presença online ("pessoas navegando agora") gravada pelo SERVIDOR.
//
// 🛰️ 15/09/2026 — Por que existe: o navegador batia direto em live_sessions com a
// chave pública, e a RLS da tabela só deixa `authenticated` inserir/atualizar.
// Resultado medido nos logs do Supabase: ~900 respostas 401 por dia e ZERO linhas
// gravadas desde 26/05/2026 — o contador da Home vivia de cache velho.
//
// Aqui a batida entra com a chave de serviço, por sessão do navegador
// (session_id gerado pelo hook useActiveSession), com limite por IP. O user_id
// vem do navegador e só serve pra contagem de presença — não autoriza nada.
import { estourouLimite, ipDoRequest } from '../_lib/rateLimit.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

// session_<epoch ms>_<9 chars base36> — o formato que o hook gera. Nada fora disso entra.
const FORMATO_SESSAO = /^session_\d{10,16}_[a-z0-9]{4,16}$/;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const sessionId = String(body?.session_id || '').slice(0, 80);
    if (!FORMATO_SESSAO.test(sessionId)) return res.status(400).json({ success: false, error: 'session_id inválido' });

    // Uma aba bate a cada 2 min (≈3 por 5 min); 60 por IP em 5 min cobre casa/escritório inteiro.
    if (await estourouLimite(`presenca:${ipDoRequest(req)}`, 60, 300)) {
      return res.status(429).json({ success: false, error: 'muitas batidas' });
    }
    if (!SUPABASE_URL || !SR) return res.status(200).json({ success: false, error: 'Config do servidor ausente' });

    const now = new Date().toISOString();
    const dados = {
      last_heartbeat: now,
      updated_date: now,
      page: String(body?.page || '/').slice(0, 200),
      user_agent: String(body?.user_agent || req.headers['user-agent'] || '').slice(0, 300),
      user_id: body?.user_id ? String(body.user_id).slice(0, 64) : null,
    };

    const achadas = await (await sb(`live_sessions?select=id&session_id=eq.${encodeURIComponent(sessionId)}&order=last_heartbeat.desc.nullslast&limit=1`)).json();
    if (Array.isArray(achadas) && achadas[0]?.id) {
      const r = await sb(`live_sessions?id=eq.${encodeURIComponent(achadas[0].id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(dados),
      });
      return res.status(200).json({ success: r.ok, acao: 'atualizada' });
    }
    const r = await sb('live_sessions', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ...dados, session_id: sessionId, created_date: now }),
    });
    return res.status(200).json({ success: r.ok, acao: 'criada' });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
