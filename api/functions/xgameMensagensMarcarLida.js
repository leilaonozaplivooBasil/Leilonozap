// xgameMensagensMarcarLida — a ÚNICA porta de escrita da coluna "lida" de
// xgame_mensagens (20/09/2026).
//
// 🐛 O ACHADO: dono, ao vivo, batendo "marcar como lida" repetidas vezes e a
// notificação voltando toda vez que ele reabria a tela — "está com um bug."
// Auditoria direta no banco confirmou: um UPDATE incondicional na tabela,
// rodando como o papel `anon` (o mesmo que `SinoNotificacoes.jsx`/
// `MensagemProCeo.jsx` usavam via `supabase.from('xgame_mensagens').update()`
// direto do navegador), afeta ZERO linhas — mesmo a policy de UPDATE sendo
// `qual: true` e a coluna `lida` tendo GRANT UPDATE pra `anon`/`authenticated`
// (migration `20260909050751_xgame_mensagens_rls.sql`). O UPDATE só volta a
// afetar linhas de verdade rodando com a chave de serviço.
//
// A CORREÇÃO segue o MESMO padrão já usado pra leitura desta tabela
// (`xgameMensagensListar.js`, mesmo comentário de por quê): a ÚNICA forma de
// marcar uma mensagem como lida passa a ser esta rota, com a chave de
// serviço — e, já que está aqui, confere que a mensagem é mesmo endereçada a
// quem está marcando (pessoa ou papel coletivo dela), pra ninguém marcar como
// lida a mensagem de outra pessoa só adivinhando o id.
import { exigirSessao } from '../_lib/sessao.js';
import { mensagensRecebidasPor, papeisDoCargo } from '../../src/lib/mensagensXgame.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const actorId = String(body?.actorId || '').trim();
    const mensagemId = String(body?.mensagemId || '').trim();
    if (!actorId || !mensagemId) return res.status(400).json({ ok: false, error: 'actorId e mensagemId obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ ok: false, error: 'Config ausente' });

    const _ses = exigirSessao(req, actorId, 'xgameMensagensMarcarLida');
    if (!_ses.liberado) return res.status(_ses.http).json({ ok: false, error: 'nao_autenticado' });

    const [atorArr, partArr, msgArr] = await Promise.all([
      sb(`app_users?select=id&id=eq.${encodeURIComponent(actorId)}&limit=1`).then((r) => r.json()),
      sb(`xgame_participantes?select=cargo&user_id=eq.${encodeURIComponent(actorId)}&limit=1`).then((r) => r.json()),
      sb(`xgame_mensagens?select=id,destino_tipo,destino_id&id=eq.${encodeURIComponent(mensagemId)}&limit=1`).then((r) => r.json()),
    ]);
    if (!Array.isArray(atorArr) || !atorArr[0]) return res.status(403).json({ ok: false, error: 'ator_desconhecido' });
    const mensagem = Array.isArray(msgArr) ? msgArr[0] : null;
    if (!mensagem) return res.status(404).json({ ok: false, error: 'mensagem_nao_encontrada' });

    const cargo = Array.isArray(partArr) ? partArr[0]?.cargo : null;
    const papeis = papeisDoCargo(cargo);
    const ehDestinatario = mensagensRecebidasPor([mensagem], { userId: actorId, papeis }).length > 0;
    if (!ehDestinatario) return res.status(403).json({ ok: false, error: 'sem_permissao' });

    const r = await sb(`xgame_mensagens?id=eq.${encodeURIComponent(mensagemId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ lida: true }),
    });
    if (!r.ok) return res.status(502).json({ ok: false, error: 'Não deu pra marcar como lida agora' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[xgameMensagensMarcarLida] erro geral', String(e?.message || e));
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
}
