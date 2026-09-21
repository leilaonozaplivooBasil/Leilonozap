// 🧠 minhasDemandas — a caixa de entrada da mente de QUEM ESTÁ PEDINDO.
//
// Dono (áudio de 19/09/2026): "vou esvaziando a mente… entra numa lista com a
// data do dia que foi anotado. E automaticamente eu já transformo isso e
// direciono para onde eu quero."
//
// GET  → o que ainda espera destino
// POST → anota uma nova (é o que o mapa mental chama ao "mandar pro quadro")
//
// 🔐 Mesma guarda do meuMapaMental, pela mesma razão: `demandas` nasce com RLS
// ligada e sem política. A identidade sai do CRACHÁ assinado, nunca do corpo —
// se viesse de `body.user_id`, trocar um número leria a cabeça de outra pessoa.

import { conferirSessao } from '../_lib/sessao.js';

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SR, Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json', ...(opts.headers || {}),
    },
  });
}

const enc = encodeURIComponent;
const ORIGENS = ['app', 'whatsapp', 'mapa', 'encontro'];
const MAX_TITULO = 300;
const MAX_DETALHE = 2000;

/**
 * Limpa o que veio do navegador.
 *
 * Origem fora da lista vira 'app' em vez de derrubar a gravação: perder a
 * anotação por causa de um rótulo errado seria trocar um defeito pequeno por
 * um grande — a pessoa esvaziou a mente e o sistema jogou fora.
 */
export function limparDemanda(body) {
  const titulo = String(body?.titulo ?? '').trim().slice(0, MAX_TITULO);
  if (!titulo) return null;   // sem título não há o que guardar nem o que achar depois
  const origem = ORIGENS.includes(body?.origem) ? body.origem : 'app';
  return {
    titulo,
    detalhe: String(body?.detalhe ?? '').trim().slice(0, MAX_DETALHE) || null,
    origem,
    origem_ref: body?.origem_ref ? String(body.origem_ref).slice(0, 120) : null,
    prazo: /^\d{4}-\d{2}-\d{2}$/.test(String(body?.prazo || '')) ? body.prazo : null,
  };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

  const ses = conferirSessao(req);
  if (!ses.ok || !ses.userId) return res.status(401).json({ success: false, error: 'nao_autenticado' });
  const dono = String(ses.userId);

  try {
    if (req.method === 'GET') {
      const linhas = await (await sb(
        `demandas?select=id,titulo,detalhe,origem,origem_ref,estado,anotada_em,prazo,cartao_id,created_at` +
        `&user_id=eq.${enc(dono)}&estado=eq.aberta&order=anotada_em.desc&limit=300`,
      )).json();
      return res.status(200).json({ success: true, demandas: Array.isArray(linhas) ? linhas : [] });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const limpa = limparDemanda(body);
      if (!limpa) return res.status(400).json({ success: false, error: 'sem_titulo' });

      const r = await sb('demandas', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        // `anotada_em` é gravado AGORA, no servidor. Vindo do navegador, o
        // relógio torto de um celular jogaria a anotação para outro dia — e é
        // pelo dia que o dono vai procurar.
        body: JSON.stringify({ ...limpa, user_id: dono, anotada_em: new Date().toISOString() }),
      });
      const salvo = await r.json().catch(() => null);
      if (!r.ok) return res.status(500).json({ success: false, error: 'falha_ao_salvar' });
      return res.status(200).json({ success: true, demanda: Array.isArray(salvo) ? salvo[0] : salvo });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || e).slice(0, 200) });
  }
}
