// 🗺️ meuMapaMental — carrega e salva O MAPA DE QUEM ESTÁ PEDINDO. Só o dele.
//
// PEDIDO DO DONO (áudio de 19/09/2026): "criar um mapa mental ali do lado,
// ligado ao quadro… onde eu esvazio a minha mente e dessa mente transformo em
// tarefa."
//
// 🔐 POR QUE ESTA ROTA EXISTE, EM VEZ DE O NAVEGADOR LER A TABELA DIRETO
//
// `mapas_mentais` nasce com RLS ligada e NENHUMA política (migração de 21/09).
// Isto é a cabeça de uma pessoa: anotação de reunião, ideia solta, o que ela
// ainda não contou pra ninguém. A convenção `USING (true)` das outras tabelas
// publicaria o caderno de todo mundo pra chave que está no pacote do site.
//
// 🔴 E A IDENTIDADE VEM DO CRACHÁ, NUNCA DO CORPO DA REQUISIÇÃO.
// Se viesse de `body.user_id`, bastaria trocar um número para ler o mapa de
// outra pessoa — e ids circulam nas respostas normais da API. É o mesmo buraco
// que o crachá assinado fechou na Leila (api/_lib/leilaAtendente.js).

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

/** Teto de nós. Mapa gigante trava a aba de quem abrir — e ninguém esvazia a mente em 2000 itens. */
const MAX_NOS = 400;
/** Teto de texto por nó. */
const MAX_TEXTO = 280;

/**
 * Limpa o que veio do navegador antes de gravar.
 *
 * Nunca confia na forma: um `nos` que não seja lista, um nó sem id, um texto
 * gigante ou um campo extra viram dado morto no banco — ou uma tela quebrada
 * na próxima vez que alguém abrir.
 */
export function limparNos(bruto) {
  if (!Array.isArray(bruto)) return [];
  const vistos = new Set();
  const saida = [];
  for (const n of bruto) {
    if (!n || typeof n !== 'object') continue;
    const id = String(n.id || '').trim();
    if (!id || vistos.has(id)) continue;   // id repetido quebraria pai/filho
    vistos.add(id);
    saida.push({
      id,
      texto: String(n.texto ?? '').slice(0, MAX_TEXTO),
      pai: n.pai ? String(n.pai) : null,
      x: Number.isFinite(Number(n.x)) ? Number(n.x) : 0,
      y: Number.isFinite(Number(n.y)) ? Number(n.y) : 0,
    });
    if (saida.length >= MAX_NOS) break;
  }
  // 🔒 Pai que não existe mais vira raiz, em vez de nó invisível: sem isto, um
  // pedaço da mente fica gravado e fora da tela para sempre.
  const ids = new Set(saida.map((n) => n.id));
  return saida.map((n) => (n.pai && !ids.has(n.pai) ? { ...n, pai: null } : n));
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

  const ses = conferirSessao(req);
  if (!ses.ok || !ses.userId) return res.status(401).json({ success: false, error: 'nao_autenticado' });
  const dono = String(ses.userId);

  try {
    if (req.method === 'GET') {
      const linhas = await (await sb(`mapas_mentais?select=id,titulo,nos,updated_at&user_id=eq.${enc(dono)}&limit=1`)).json();
      const mapa = Array.isArray(linhas) ? linhas[0] : null;
      // Sem mapa ainda não é erro: é a primeira vez. A tela desenha a raiz.
      return res.status(200).json({ success: true, mapa: mapa || null });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const nos = limparNos(body.nos);
      const titulo = String(body.titulo || 'Meu mapa').slice(0, 120);

      const existentes = await (await sb(`mapas_mentais?select=id&user_id=eq.${enc(dono)}&limit=1`)).json();
      const jaTem = Array.isArray(existentes) && existentes[0]?.id;

      const corpo = JSON.stringify({ user_id: dono, titulo, nos, updated_at: new Date().toISOString() });
      const r = jaTem
        // 🔒 O filtro por user_id fica no UPDATE também, e não só no id: assim
        // nem um id trocado alcança o mapa de outra pessoa.
        ? await sb(`mapas_mentais?id=eq.${enc(jaTem)}&user_id=eq.${enc(dono)}`, {
          method: 'PATCH', headers: { Prefer: 'return=representation' }, body: corpo,
        })
        : await sb('mapas_mentais', {
          method: 'POST', headers: { Prefer: 'return=representation' }, body: corpo,
        });

      const salvo = await r.json().catch(() => null);
      if (!r.ok) return res.status(500).json({ success: false, error: 'falha_ao_salvar' });
      return res.status(200).json({ success: true, mapa: Array.isArray(salvo) ? salvo[0] : salvo });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || e).slice(0, 200) });
  }
}
