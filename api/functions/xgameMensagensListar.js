// xgameMensagensListar — a ÚNICA porta de leitura de xgame_mensagens
// (09/09/2026, achado crítico na auditoria pré-publicação).
//
// O QUE ESTAVA ERRADO: a policy de SELECT de `xgame_mensagens` no banco era
// `qual: true` — QUALQUER requisição com a chave anon (que é pública, vem no
// bundle do site) lia a tabela inteira. `MensagemProCeo.jsx`/
// `CaixaDeMensagensAdmin.jsx` buscavam as 200/300 linhas mais recentes DE
// TODO MUNDO e só filtravam depois, no navegador — o "pra quem é essa
// mensagem" era só visual. Qualquer um com o DevTools aberto lia o inbox do
// CEO, demandas privadas entre colegas e avisos disciplinares sobre outras
// pessoas.
//
// A CORREÇÃO: a policy de SELECT agora nega leitura direta (ver a migration
// `20260909210000_xgame_mensagens_rls.sql`) — a ÚNICA forma de ler mensagens
// passa a ser esta rota, que usa a chave de serviço (ignora RLS) e filtra
// no SERVIDOR com as MESMAS funções puras que a tela já usava
// (`mensagensRecebidasPor`/`mensagensEnviadasPor`/`papeisDoCargo`, em
// `src/lib/mensagensXgame.js`) — só que agora quem decide o que cada um vê
// é o servidor, não o navegador de quem está pedindo.
//
// 🪪 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log, não bloqueia ainda; ver
// api/_lib/sessao.js). Isso segue a MESMA régua de todo o resto do projeto:
// enquanto `SESSAO_MODO` não virar 'bloquear', esta rota confia no `actorId`
// que o corpo manda (como o resto do app sempre confiou) — mas, diferente
// de antes, pelo menos confere que esse `actorId` é uma pessoa de verdade
// (existe em app_users) antes de decidir o que devolver, e NUNCA manda o
// dump bruto da tabela pro navegador. Fechar de vez (exigir crachá válido)
// é um passo de infraestrutura maior (a maioria dos 673 usuários ainda não
// tem sessão real do Supabase Auth — só 25 têm `auth_user_id`), fora do
// escopo desta correção pontual.
import { exigirSessao } from '../_lib/sessao.js';
import { mensagensRecebidasPor, mensagensEnviadasPor, papeisDoCargo } from '../../src/lib/mensagensXgame.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SR, Authorization: `Bearer ${SR}` } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const actorId = String(body?.actorId || '').trim();
    const verTudo = !!body?.verTudo;
    if (!actorId) return res.status(400).json({ ok: false, error: 'actorId obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ ok: false, error: 'Config ausente' });

    // 🔐 anota no log quem chamou sem crachá — não bloqueia (etapa 1)
    const _ses = exigirSessao(req, actorId, 'xgameMensagensListar');
    if (!_ses.liberado) return res.status(_ses.http).json({ ok: false, error: 'nao_autenticado' });

    const [atorArr, partArr] = await Promise.all([
      sb(`app_users?select=id,role&id=eq.${encodeURIComponent(actorId)}&limit=1`).then((r) => r.json()),
      sb(`xgame_participantes?select=user_id,cargo&user_id=eq.${encodeURIComponent(actorId)}&limit=1`).then((r) => r.json()),
    ]);
    const ator = Array.isArray(atorArr) ? atorArr[0] : null;
    if (!ator) return res.status(403).json({ ok: false, error: 'ator_desconhecido' });
    const cargo = Array.isArray(partArr) ? partArr[0]?.cargo : null;

    // "ver tudo" (a Caixa do ADM) exige admin/super_admin OU ser o CEO —
    // mesma régua de quem já vê o painel administrativo inteiro.
    const podeVerTudo = ['admin', 'super_admin'].includes(ator.role) || cargo === 'ceo';
    if (verTudo && !podeVerTudo) return res.status(403).json({ ok: false, error: 'sem_permissao' });

    const limite = verTudo ? 300 : 200;
    const todas = await sb(`xgame_mensagens?select=*&order=created_at.desc&limit=${limite}`).then((r) => r.json());
    if (!Array.isArray(todas)) return res.status(200).json({ ok: false, error: 'Não deu pra buscar as mensagens agora' });

    if (verTudo) return res.status(200).json({ ok: true, mensagens: todas });

    const papeis = papeisDoCargo(cargo);
    const recebidas = mensagensRecebidasPor(todas, { userId: actorId, papeis });
    const enviadas = mensagensEnviadasPor(todas, actorId);
    const porId = new Map();
    for (const m of [...recebidas, ...enviadas]) porId.set(m.id, m);
    return res.status(200).json({ ok: true, mensagens: [...porId.values()] });
  } catch (e) {
    console.error('[xgameMensagensListar] erro geral', String(e?.message || e));
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
}
